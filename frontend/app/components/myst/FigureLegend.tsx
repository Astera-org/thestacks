import { unwrapAnchors } from "@/lib/comments/inlineCommentAnchors";
import {
  LEGEND_CONTENT_CHANGED_EVENT,
  LEGEND_CUT_CLASS,
  LEGEND_REST_CLASS,
  truncatedLegends
} from "@/lib/truncatedLegends";
import {
  Children,
  type ComponentPropsWithoutRef,
  type ReactElement,
  type ReactNode,
  cloneElement,
  isValidElement,
  useEffect,
  useLayoutEffect,
  useRef,
  useState
} from "react";
import ToggleExpandLegendIcon from "../icons/ToggleExpandLegend";

const CAPTION_CHAR_LIMIT_BASE = 375;
// If the caption exceeds the character limit, cut off at the limit * factor
const CAPTION_CHAR_TRUNCATION_FACTOR = 0.8;
const ELLIPSIS_CHAR = "\u2026";

/**
 * WeakMap storing the full (un-truncated) innerHTML for each legend element.
 * Used by MystFigure to get the full caption HTML for the lightbox even when
 * the legend is currently showing truncated content.
 */
export const legendFullHtmlMap = new WeakMap<HTMLElement, string>();

function getInnerWidth(element: Element): number {
  const style = window.getComputedStyle(element);
  return (
    element.clientWidth -
    parseFloat(style.paddingLeft) -
    parseFloat(style.paddingRight)
  );
}

/**
 * Extract requested figure width multiplier from the media's style.
 * Returns 1 if no multiplier found (full width assumed).
 */
export function getRequestedFigureWidthMultiplier(figure: Element): number {
  const media = figure.querySelector("img, video, iframe");
  if (!media) return 1;

  const style = media.getAttribute("style") || "";
  // format: min(calc(${widthAsFraction} * var(--figure-max-w)), 100cqi)
  // See mystRenderer::proportionalFigureWidthExpression for the format of this string
  const match = style.match(/min\(calc\(([\d.]+) \* var/);
  if (match) {
    const multiplier = parseFloat(match[1]);
    if (!isNaN(multiplier) && multiplier > 0 && multiplier <= 1) {
      return multiplier;
    }
  }
  return 1;
}

/**
 * Get the figure width multiplier from rendered layout so it matches CSS
 * formulas that expand percentage figures in narrow containers.
 */
export function getFigureWidthMultiplier(figure: Element): number {
  const media = figure.querySelector("img, video, iframe");
  const column = figure.parentElement;
  if (!media || !column) return 1;

  const columnWidth = getInnerWidth(column);
  const mediaWidth = media.clientWidth;
  if (columnWidth > 0 && mediaWidth > 0) {
    return Math.min(mediaWidth / columnWidth, 1);
  }

  return getRequestedFigureWidthMultiplier(figure);
}

/** Count the total text characters inside a ReactNode tree. */
function getTextLength(node: ReactNode): number {
  if (node == null || typeof node === "boolean") return 0;
  if (typeof node === "string") return node.length;
  if (typeof node === "number") return String(node).length;
  if (Array.isArray(node))
    return node.reduce((sum: number, child) => sum + getTextLength(child), 0);
  if (isValidElement(node)) {
    const { children } = (node as ReactElement<{ children?: ReactNode }>).props;
    return getTextLength(children);
  }
  return 0;
}

type TruncateResult = { node: ReactNode; used: number; truncated: boolean };

function truncateNode(node: ReactNode, remaining: number): TruncateResult {
  if (node == null || typeof node === "boolean") {
    return { node, used: 0, truncated: false };
  }

  if (typeof node === "string") {
    if (node.length <= remaining)
      return { node, used: node.length, truncated: false };
    const lastSpace = node.lastIndexOf(" ", remaining);
    const cutPoint = lastSpace > 0 ? lastSpace : 0;
    const truncatedText = node
      .slice(0, cutPoint)
      .trimEnd()
      .concat(ELLIPSIS_CHAR); // Add ellipsis character
    return { node: truncatedText || null, used: cutPoint, truncated: true };
  }

  if (typeof node === "number") {
    const str = String(node);
    if (str.length <= remaining)
      return { node, used: str.length, truncated: false };
    return { node: null, used: 0, truncated: true };
  }

  if (Array.isArray(node)) {
    const out: ReactNode[] = [];
    let used = 0;
    for (const child of node) {
      const result = truncateNode(child, Math.max(0, remaining - used));
      if (result.node != null) out.push(result.node);
      used += result.used;
      if (result.truncated) return { node: out, used, truncated: true };
    }
    return { node: out, used, truncated: false };
  }

  if (isValidElement(node)) {
    const element = node as ReactElement<{ children?: ReactNode }>;

    // Drop <a> entirely rather than truncating mid-link
    if (element.type === "a") {
      const len = getTextLength(element.props.children);
      if (len <= remaining) return { node, used: len, truncated: false };
      return { node: ELLIPSIS_CHAR, used: 0, truncated: true };
    }

    const { children: elementChildren } = element.props;
    if (elementChildren == null) return { node, used: 0, truncated: false };

    const result = truncateNode(elementChildren, remaining);
    if (!result.truncated) return { node, used: result.used, truncated: false };
    if (result.used === 0)
      return { node: ELLIPSIS_CHAR, used: 0, truncated: true };
    return {
      node: cloneElement(element, {}, result.node),
      used: result.used,
      truncated: true
    };
  }

  return { node, used: 0, truncated: false };
}

/**
 * A legend split for truncation at the top-level block (usually a paragraph)
 * its character limit falls in. Collapsed, the legend shows `head` and `cut`,
 * and hides `rest` until it's found or expanded; expanded, it shows `head`
 * and `rest`, which together are the whole legend.
 */
export interface LegendSplit {
  /** The blocks before the one the limit falls in. */
  head: ReactNode;
  /** That block cut at the limit, at a word boundary, with an ellipsis. */
  cut: ReactNode;
  /** That block in full, and the blocks after it. */
  rest: ReactNode;
}

/**
 * Splits a ReactNode tree at its top-level block holding the maxChars-th
 * text character. Links are dropped rather than cut mid-link.
 */
function splitChildren(children: ReactNode, maxChars: number): LegendSplit {
  const blocks = Children.toArray(children);
  let used = 0;
  for (const [i, block] of blocks.entries()) {
    const length = getTextLength(block);
    if (used + length > maxChars) {
      return {
        head: blocks.slice(0, i),
        cut: truncateNode(block, maxChars - used).node,
        rest: blocks.slice(i)
      };
    }
    used += length;
  }
  return { head: blocks, cut: null, rest: null };
}

interface FigureLegendProps extends ComponentPropsWithoutRef<"div"> {
  children?: ReactNode;
  /**
   * Splits the legend at maxChars text characters. Needed when children are
   * components whose text is not in their props (e.g. a MyST AST), which the
   * default ReactNode split cannot see into.
   */
  split?: (maxChars: number) => LegendSplit;
}

/**
 * Custom figure-legend component with truncation support.
 *
 * On mount, it measures the text content length. If it exceeds the character
 * limit (based on figure width), it shows only the start of the legend, with
 * a "Read all" / "Collapse" toggle. The rest stays in the DOM, hidden until
 * found, so the browser's find in page can match it, which expands the
 * legend, and comments can be anchored in it.
 */
export default function FigureLegend({
  children,
  className,
  split,
  ...props
}: FigureLegendProps) {
  const ref = useRef<HTMLDivElement>(null);
  const restRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<"initial" | "truncated" | "expanded">(
    "initial"
  );
  const [truncateLimit, setTruncateLimit] = useState(CAPTION_CHAR_LIMIT_BASE);

  useEffect(() => {
    const el = ref.current;
    if (!el || mode !== "initial") return;

    const figure = el.closest("figure");
    if (!figure) return;

    // Desktop only: skip truncation for floated figures
    const isMobile = window.matchMedia("(max-width: 767px)").matches;
    if (!isMobile) {
      const isFloated =
        figure.classList.contains("float-left") ||
        figure.classList.contains("float-right");
      if (isFloated) return;
    }

    const widthMultiplier = getFigureWidthMultiplier(figure);
    const charLimit = Math.round(widthMultiplier * CAPTION_CHAR_LIMIT_BASE);
    const text = el.textContent || "";

    if (text.length <= charLimit && text.length <= truncateLimit) return;

    if (text.length <= charLimit) {
      setTruncateLimit(charLimit);
      setMode("initial");
      return;
    }

    // Before React replaces the content. See `unwrapAnchors`.
    unwrapAnchors(el);
    // Provide the full HTML for the lightbox
    legendFullHtmlMap.set(el, el.innerHTML);

    const truncatedCharLimit = Math.round(
      charLimit * CAPTION_CHAR_TRUNCATION_FACTOR
    );
    setTruncateLimit(truncatedCharLimit);
    setMode("truncated");
  }, [mode, truncateLimit]);

  // Clean up WeakMap entry only on unmount (not on mode transitions)
  useEffect(() => {
    const el = ref.current;
    return () => {
      if (el) legendFullHtmlMap.delete(el);
    };
  }, []);

  // A layout effect, so the rest is hidden before it paints. React 19 only
  // knows `hidden` as a boolean, so "until-found" is set here rather than as
  // a prop. Find in page removes it itself before firing `beforematch`.
  useLayoutEffect(() => {
    const el = ref.current;
    const rest = restRef.current;
    if (!el || !rest) return;
    if (mode === "truncated") {
      rest.setAttribute("hidden", "until-found");
      truncatedLegends.set(el, { expand: () => setMode("expanded") });
    } else {
      rest.removeAttribute("hidden");
    }
    window.dispatchEvent(new Event(LEGEND_CONTENT_CHANGED_EVENT));
    return () => {
      truncatedLegends.delete(el);
    };
  }, [mode]);

  useEffect(() => {
    const rest = restRef.current;
    if (!rest || mode === "initial") return;
    const expand = () => setMode("expanded");
    rest.addEventListener("beforematch", expand);
    return () => rest.removeEventListener("beforematch", expand);
  }, [mode]);

  // Initial render: let React render children so we can measure
  if (mode === "initial") {
    return (
      <div ref={ref} className={className} {...props}>
        {children}
      </div>
    );
  }

  const isTruncated = mode === "truncated";
  const { head, cut, rest } = split
    ? split(truncateLimit)
    : splitChildren(children, truncateLimit);

  // The same slots whether truncated or expanded, so toggling never re-renders
  // `head` or `rest`: comment anchors wrap their text, which React must not
  // rewrite.
  const theChildren = (
    <>
      {head}
      {isTruncated && <div className={LEGEND_CUT_CLASS}>{cut}</div>}
      {isTruncated && (
        <button
          className="caption-read-all"
          type="button"
          aria-expanded="false"
          aria-label="Read all"
        >
          Read all <ToggleExpandLegendIcon aria-hidden={true} />
        </button>
      )}
      <div ref={restRef} className={LEGEND_REST_CLASS}>
        {rest}
      </div>
      {!isTruncated && (
        <span className="caption-collapse-wrapper">
          <button
            className="caption-read-all expanded"
            type="button"
            aria-expanded="true"
            aria-label="Collapse"
          >
            Collapse <ToggleExpandLegendIcon aria-hidden={true} />
          </button>
        </span>
      )}
    </>
  );

  const handleClick = (e: React.MouseEvent) => {
    const btn = (e.target as HTMLElement).closest(".caption-read-all");
    if (!btn) return;

    // If the user finished a text-selection drag on or near the button, the
    // browser fires a click event. Toggling the mode would replace the DOM via
    // dangerouslySetInnerHTML and destroy the selection, so bail out.
    const sel = window.getSelection();
    if (sel && !sel.isCollapsed && ref.current?.contains(sel.anchorNode))
      return;

    setMode(isTruncated ? "expanded" : "truncated");
  };

  return (
    <div ref={ref} className={className} {...props} onClick={handleClick}>
      {theChildren}
    </div>
  );
}
