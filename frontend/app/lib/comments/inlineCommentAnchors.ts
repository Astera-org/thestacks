import { type Anchor, locateComment } from "@/lib/comments/commentLocator";
import { LEGEND_CUT_CLASS, LEGEND_REST_CLASS } from "@/lib/truncatedLegends";
import { Comment } from "@/types";

/**
 * Wait for every `<img>` inside the publication body to finish loading
 * (or error) before invoking `onImagesLoaded`. This is needed because
 * images shift layout, so comment-anchor positions must be recalculated
 * once all images have settled.
 */
export function setupImageObserver(onImagesLoaded: () => void) {
  const bodyEl = document.getElementById("publication-body");
  if (!bodyEl) return;

  const images = bodyEl.querySelectorAll("img");
  let loadedCount = 0;
  const totalImages = images.length;

  if (totalImages === 0) {
    onImagesLoaded();
    return;
  }

  images.forEach((img) => {
    if (img.complete) {
      loadedCount++;
      if (loadedCount === totalImages) {
        onImagesLoaded();
      }
    } else {
      img.addEventListener(
        "load",
        () => {
          loadedCount++;
          if (loadedCount === totalImages) {
            onImagesLoaded();
          }
        },
        { once: true }
      );
      img.addEventListener(
        "error",
        () => {
          loadedCount++;
          if (loadedCount === totalImages) {
            onImagesLoaded();
          }
        },
        { once: true }
      );
    }
  });
}

/** Text nodes that wrapping split off after an anchor, which unwrapping merges back. */
const splitOffText = new WeakSet<Text>();

/**
 * Remove the comment anchor wrappers under `root`, merging their text back
 * into the text node it was split from. Wrapping splits a text node React
 * rendered, leaving React holding only the part before the anchor, so the
 * pieces have to be rejoined before React re-renders that content; otherwise
 * React rewrites its node and the anchor and remainder show twice.
 */
export function unwrapAnchors(root: ParentNode) {
  root
    .querySelectorAll<HTMLElement>(".comment-anchor-wrapper")
    .forEach((wrapper) => {
      const parent = wrapper.parentNode;
      if (!parent) return;
      const before = wrapper.previousSibling;
      const after = wrapper.nextSibling;
      if (!(before instanceof Text)) {
        while (wrapper.firstChild)
          parent.insertBefore(wrapper.firstChild, wrapper);
        wrapper.remove();
        return;
      }
      before.appendData(wrapper.textContent ?? "");
      wrapper.remove();
      if (after instanceof Text && splitOffText.has(after)) {
        before.appendData(after.data);
        after.remove();
      }
    });
}

type TextNodeSpan = { node: Text; offset: number; length: number };

/**
 * A truncated legend's cut copy of its last shown block. It reads the same as
 * the start of the hidden text from `start`, for `shown` characters, up to
 * where it was cut. `textNodes` offsets are into the collected text, as if
 * the copy stood in for that hidden text.
 */
type CutCopy = { start: number; shown: number; textNodes: TextNodeSpan[] };

/** Whether `node` is in a formula's hidden MathML (a copy and its TeX source). */
function inFormulaMathml(node: Text) {
  return node.parentElement?.closest(".katex-mathml") != null;
}

/**
 * The text comments are located in, with its text nodes. Leaves out formula
 * MathML (`withMathml` keeps it, less its TeX source), legend toggles and cut copies.
 */
function collectText(container: HTMLElement, { withMathml = false } = {}) {
  const textNodes: TextNodeSpan[] = [];
  const parts: string[] = [];
  const cuts = new Map<Element, { nodes: Text[]; start?: number }>();
  let offset = 0;

  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const node = n as Text;
    if (node.length === 0) continue;
    const parent = node.parentElement;
    if (
      inFormulaMathml(node) &&
      (!withMathml || parent?.closest("annotation"))
    ) {
      continue;
    }
    // "Read all" / "Collapse", which isn't legend text
    if (parent?.closest(".caption-read-all")) continue;
    const legend = parent?.closest(".figure-legend");
    if (legend && parent?.closest(`.${LEGEND_CUT_CLASS}`)) {
      const cut = cuts.get(legend) ?? { nodes: [] };
      cut.nodes.push(node);
      cuts.set(legend, cut);
      continue;
    }
    const cut = legend ? cuts.get(legend) : undefined;
    if (cut && cut.start == null && parent?.closest(`.${LEGEND_REST_CLASS}`)) {
      cut.start = offset;
    }

    textNodes.push({ node, offset, length: node.length });
    parts.push(node.data);
    offset += node.length;
  }

  const fullText = parts.join("");
  const cutCopies: CutCopy[] = [];
  for (const { nodes, start } of cuts.values()) {
    if (start == null) continue;
    let local = 0;
    const spans = nodes.map((node) => {
      const span = { node, offset: start + local, length: node.length };
      local += node.length;
      return span;
    });
    const cutText = nodes.map((node) => node.data).join("");
    const shown = sharedPrefixLength(
      cutText,
      fullText.slice(start, start + cutText.length)
    );
    cutCopies.push({ start, shown, textNodes: spans });
  }

  return { textNodes, cutCopies, fullText };
}

function sharedPrefixLength(a: string, b: string) {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return i;
}

/** How much text either side of its anchor a new comment keeps. */
const CONTEXT_LENGTH = 128;

export interface CapturedAnchor {
  /** The selected text as comments are located in (see `collectText()`). */
  text: string;
  /** Whether `text` left out a legend's ellipsis or toggle label (not MathML). */
  stripped: boolean;
  /** Up to 128 characters before `text`. */
  pre: string;
  /** Up to 128 characters after `text`. */
  post: string;
}

/**
 * The anchor and context of a new comment on `range`, from `collectText()`.
 * Null when the range holds none of that text, e.g. only a toggle label.
 */
export function captureAnchorContext(
  container: HTMLElement,
  range: Range
): CapturedAnchor | null {
  const { textNodes, cutCopies, fullText } = collectText(container);

  // Where each text node's text is in `fullText`, and where it stops counting:
  // a cut copy stops where it was cut
  const spans = new Map<Text, { offset: number; end: number }>();
  for (const { node, offset, length } of textNodes) {
    spans.set(node, { offset, end: offset + length });
  }
  for (const cut of cutCopies) {
    const shownEnd = cut.start + cut.shown;
    for (const { node, offset, length } of cut.textNodes) {
      spans.set(node, { offset, end: Math.min(offset + length, shownEnd) });
    }
  }

  let start: number | undefined;
  let end = 0;
  let selected = 0;
  let counted = 0;
  for (const node of textNodesIn(range)) {
    if (!container.contains(node) || inFormulaMathml(node)) continue;
    const from = node === range.startContainer ? range.startOffset : 0;
    const to = node === range.endContainer ? range.endOffset : node.length;
    if (from >= to) continue;
    selected += to - from;

    const span = spans.get(node);
    if (!span) continue;
    const spanFrom = Math.min(span.offset + from, span.end);
    const spanTo = Math.min(span.offset + to, span.end);
    if (spanFrom >= spanTo) continue;
    counted += spanTo - spanFrom;
    start ??= spanFrom;
    end = Math.max(end, spanTo);
  }
  if (start === undefined) return null;

  while (start < end && /\s/.test(fullText[start])) start++;
  while (end > start && /\s/.test(fullText[end - 1])) end--;
  if (start === end) return null;

  return {
    text: fullText.slice(start, end),
    stripped: counted < selected,
    pre: fullText.slice(Math.max(0, start - CONTEXT_LENGTH), start),
    post: fullText.slice(end, end + CONTEXT_LENGTH)
  };
}

/** The text nodes `range` touches, in document order. */
function textNodesIn(range: Range): Text[] {
  const root = range.commonAncestorContainer;
  if (root instanceof Text) return [root];
  const nodes: Text[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (range.intersectsNode(n)) nodes.push(n as Text);
  }
  return nodes;
}

/**
 * `text` NFKC-normalized without whitespace or zero-width spaces, and the
 * range in `text` each character came from.
 */
function comparable(text = "") {
  const starts: number[] = [];
  const ends: number[] = [];
  let normalized = "";
  let i = 0;
  for (const char of text) {
    const end = i + char.length;
    const kept = (char < "\u0080" ? char : char.normalize("NFKC")).replace(
      /[\s\u200b]/g,
      ""
    );
    for (let k = 0; k < kept.length; k++) {
      starts.push(i);
      ends.push(end);
    }
    normalized += kept;
    i = end;
  }
  return { normalized, starts, ends };
}

/**
 * Finds older anchors that include formula MathML exactly in the text with it,
 * as a range in `visible`, so only visible text is wrapped.
 */
function locatorWithMathml(
  container: HTMLElement,
  visible: TextNodeSpan[]
): (anchor: Anchor) => { start: number; end: number } | null {
  if (!container.querySelector(".katex-mathml")) return () => null;

  const { textNodes, fullText } = collectText(container, { withMathml: true });
  // `sel.toString()` put MathML tokens on their own lines, as math italics (𝐴)
  const { normalized, starts, ends } = comparable(fullText);
  const visibleOffsets = new Map(
    visible.map(({ node, offset }) => [node, offset])
  );

  return (anchor) => {
    const found = locateComment(
      normalized,
      {
        selection: comparable(anchor.selection).normalized,
        prefix: comparable(anchor.prefix).normalized,
        suffix: comparable(anchor.suffix).normalized
      },
      { fuzzy: false }
    );
    if (!found) return null;
    const located = { start: starts[found.start], end: ends[found.end - 1] };

    let start: number | undefined;
    let end = 0;
    for (const { node, offset, length } of textNodes) {
      if (offset >= located.end) break;
      const from = Math.max(located.start - offset, 0);
      const to = Math.min(located.end - offset, length);
      if (from >= to) continue;
      const visibleOffset = visibleOffsets.get(node);
      // In a formula's MathML
      if (visibleOffset === undefined) continue;
      start ??= visibleOffset + from;
      end = visibleOffset + to;
    }
    return start === undefined ? null : { start, end };
  };
}

type LocatedRange = { commentId: number; start: number; end: number };

/** A stretch of text the same comments cover, shortest comment first. */
type Piece = { start: number; end: number; commentIds: number[] };

/** Splits `ranges` at every start and end into pieces, in page order. */
function splitIntoPieces(ranges: LocatedRange[]): Piece[] {
  const bounds = [...new Set(ranges.flatMap((r) => [r.start, r.end]))].sort(
    (a, b) => a - b
  );
  const pieces: Piece[] = [];
  for (let i = 0; i < bounds.length - 1; i++) {
    const [start, end] = [bounds[i], bounds[i + 1]];
    const covering = ranges
      .filter((r) => r.start <= start && r.end >= end)
      // Shortest first, so a tap on shared text opens the innermost comment
      .sort((a, b) => a.end - a.start - (b.end - b.start));
    if (covering.length === 0) continue;
    pieces.push({ start, end, commentIds: covering.map((r) => r.commentId) });
  }
  return pieces;
}

/** Wraps `piece`'s text, in `textNodes`, in `.comment-anchor-wrapper`s. */
function wrapPiece(textNodes: TextNodeSpan[], piece: Piece) {
  type AnchorNode = { node: Node; startOffset: number; endOffset: number };
  const anchorNodes: AnchorNode[] = [];

  for (const entry of textNodes) {
    const nodeStart = entry.offset;
    const nodeEnd = entry.offset + entry.length;
    if (nodeEnd <= piece.start) continue;
    if (nodeStart >= piece.end) break;

    const localStart = Math.max(0, piece.start - nodeStart);
    const localEnd = Math.min(entry.length, piece.end - nodeStart);
    if (localStart < localEnd) {
      anchorNodes.push({
        node: entry.node,
        startOffset: localStart,
        endOffset: localEnd
      });
    }
  }

  anchorNodes.forEach((an) => {
    const nodeLen =
      an.node.nodeType === Node.TEXT_NODE
        ? (an.node as Text).length
        : (an.node.textContent?.length ?? 0);

    if (
      nodeLen === 0 ||
      an.startOffset > nodeLen ||
      an.endOffset > nodeLen ||
      an.startOffset >= an.endOffset
    ) {
      return;
    }

    const range = document.createRange();
    range.setStart(an.node, an.startOffset);
    range.setEnd(an.node, an.endOffset);

    const span = document.createElement("span");
    span.className = "comment-anchor-wrapper";
    span.dataset.commentIds = piece.commentIds.join(" ");

    try {
      range.surroundContents(span);
      if (span.nextSibling instanceof Text) splitOffText.add(span.nextSibling);
    } catch {
      // `surroundContents` fails when the range partially selects a
      // non-text node; safe to skip since the anchor is best-effort.
    }
  });
}

/**
 * Gives each comment's first wrapper in page order `id="anchor-{id}"`, unless
 * another comment's took it; `findAnchorElement()` then finds it by its IDs.
 */
function assignAnchorIds(container: HTMLElement) {
  const seen = new Set<string>();
  container
    .querySelectorAll<HTMLElement>(".comment-anchor-wrapper")
    .forEach((wrapper) => {
      for (const id of wrapper.dataset.commentIds?.split(" ") ?? []) {
        if (seen.has(id)) continue;
        seen.add(id);
        if (!wrapper.id) wrapper.id = `anchor-${id}`;
      }
    });
}

/**
 * Wraps each comment's text in `.comment-anchor-wrapper`s, split where comments
 * overlap. A comment in a truncated legend goes in its cut copy if it's all in
 * the shown part, otherwise in the hidden text.
 */
export function injectAnchorsIntoDom(
  container: HTMLElement,
  comments: Comment[]
): void {
  unwrapAnchors(container);

  if (comments.length === 0) return;

  const { textNodes, cutCopies, fullText } = collectText(container);
  if (textNodes.length === 0) return;

  // Built for the first comment that isn't in `fullText` exactly
  let locateInMathml: ReturnType<typeof locatorWithMathml> | undefined;
  // The comments to wrap in each set of text nodes, decided per comment
  const sides = new Map<TextNodeSpan[], LocatedRange[]>();

  for (const c of comments) {
    if (!c.anchor_text || c.anchor_text.length === 0) continue;
    const anchor: Anchor = {
      selection: c.anchor_text,
      prefix: c.pre_text ?? "",
      suffix: c.post_text ?? ""
    };
    // Fuzzy last: on an anchor with MathML it overruns by the MathML's length
    const located =
      locateComment(fullText, anchor, { fuzzy: false }) ??
      (locateInMathml ??= locatorWithMathml(container, textNodes))(anchor) ??
      locateComment(fullText, anchor);
    if (!located) continue;

    const cutCopy = cutCopies.find(
      (cut) =>
        located.start >= cut.start && located.end <= cut.start + cut.shown
    );
    const side = cutCopy?.textNodes ?? textNodes;
    const ranges = sides.get(side) ?? [];
    const { start, end } = located;
    ranges.push({ commentId: c.comment_id, start, end });
    sides.set(side, ranges);
  }

  for (const [side, ranges] of sides) {
    // Bottom to top, so wrapping a piece doesn't move the text before it
    for (const piece of splitIntoPieces(ranges).reverse()) {
      wrapPiece(side, piece);
    }
  }
  assignAnchorIds(container);

  // Defer the event dispatch so listeners run after the DOM has fully settled.
  setTimeout(() => {
    window.dispatchEvent(new Event("stacks-anchors-updated"));
  }, 0);
}
