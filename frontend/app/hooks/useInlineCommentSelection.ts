import { captureAnchorContext } from "@/lib/comments/inlineCommentAnchors";
import DOMPurify from "dompurify";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const HIGHLIGHT_NAME = "temp-comment-highlight";

const DEBOUNCE_MS = 150;

const MAX_ANCHOR_LEN = 1024;

type SelectionState = { rect: DOMRect | null; text: string; crosses: boolean };

/** No selection a comment can be made on, so no bubble menu. */
const NO_SELECTION: SelectionState = { rect: null, text: "", crosses: false };

/** A MyST equation: its formula's `.katex-display`, and its number. */
const MYST_MATH_SELECTOR = ".mystmd-math";

const BLOCK_SELECTOR = `p, h1, h2, h3, h4, h5, h6, li, blockquote, pre, td, th, .katex-display, ${MYST_MATH_SELECTOR}`;

/**
 * Walk up from `node` to find the direct child of `root` that contains it.
 * Returns null if `node` is not inside `root`.
 */
function topLevelChildOf(node: Node, root: Element): Element | null {
  let el =
    node.nodeType === Node.ELEMENT_NODE
      ? (node as Element)
      : node.parentElement;
  while (el && el !== root && el.parentElement !== root) {
    el = el.parentElement;
  }
  return el && el !== root ? el : null;
}

function selectionCrossesBlock(sel: Selection): boolean {
  if (!sel.rangeCount) return false;
  const range = sel.getRangeAt(0);

  const toElement = (node: Node) =>
    node.nodeType === Node.ELEMENT_NODE
      ? (node as Element)
      : node.parentElement;

  // A MyST equation is one block, though its formula's `.katex-display`
  // would otherwise be the closest one to the formula's text
  const blockOf = (node: Node) => {
    const el = toElement(node);
    return el?.closest(MYST_MATH_SELECTOR) ?? el?.closest(BLOCK_SELECTOR);
  };

  const startBlock = blockOf(range.startContainer);
  const endBlock = blockOf(range.endContainer);

  // Both inside recognized block elements — just compare them.
  if (startBlock && endBlock) {
    if (startBlock === endBlock) return false;

    // When a full paragraph is selected (e.g. triple-click), browsers extend
    // the range end to offset 0 of the next block element. No content from
    // that block is actually selected, so this isn't a true cross-block selection.
    if (range.endOffset === 0) {
      const probe = document.createRange();
      probe.setStart(endBlock, 0);
      probe.setEnd(range.endContainer, range.endOffset);
      if (probe.toString().length === 0) return false;
    }

    return true;
  }

  // At least one endpoint is outside a recognized block (e.g. a figure, or
  // other top-level content). Fall back to checking whether both
  // endpoints live under the same direct child of the publication body.
  const body = document.getElementById("publication-body");
  if (!body) return true;

  const startTop = topLevelChildOf(range.startContainer, body);
  const endTop = topLevelChildOf(range.endContainer, body);

  if (!startTop || !endTop) return true;
  return startTop !== endTop;
}

/**
 * Clone the selected range into a fragment and produce sanitized HTML that
 * preserves KaTeX visual rendering spans while stripping MathML accessibility
 * duplicates, anchor wrappers, and links.
 */
function extractSelectionHtml(sel: Selection): string | null {
  if (!sel.rangeCount) return null;
  const range = sel.getRangeAt(0);
  const fragment = range.cloneContents();
  const container = document.createElement("div");
  container.appendChild(fragment);

  container.querySelectorAll(".katex-mathml").forEach((el) => el.remove());

  container.querySelectorAll(".comment-anchor-wrapper, a").forEach((el) => {
    const parent = el.parentNode;
    if (!parent) return;
    while (el.firstChild) parent.insertBefore(el.firstChild, el);
    parent.removeChild(el);
  });

  // range.cloneContents() only includes nodes from the common ancestor
  // downward, so when a selection is entirely within a math block the .katex
  // (and .katex-display) wrappers are excluded. All KaTeX CSS is scoped under
  // .katex, so without it vlists and positioning break. Re-wrap if needed.

  if (
    container.querySelector(".katex-html, .base, .vlist-t") &&
    !container.querySelector(".katex")
  ) {
    const ancestor = range.commonAncestorContainer;
    const isDisplayMath =
      (ancestor.nodeType === Node.ELEMENT_NODE
        ? (ancestor as Element)
        : ancestor.parentElement
      )?.closest(".katex-display") != null;

    // Restore missing intermediate wrappers (.katex-html and .base) that
    // range.cloneContents() strips when the selection is deep inside the
    // KaTeX tree. These provide position:relative / display:inline-block
    // which vlist absolute positioning depends on.
    if (!container.querySelector(".base")) {
      const baseWrapper = document.createElement("span");
      baseWrapper.className = "base";
      while (container.firstChild)
        baseWrapper.appendChild(container.firstChild);
      container.appendChild(baseWrapper);
    }
    if (!container.querySelector(".katex-html")) {
      const katexHtmlWrapper = document.createElement("span");
      katexHtmlWrapper.className = "katex-html";
      katexHtmlWrapper.setAttribute("aria-hidden", "true");
      while (container.firstChild)
        katexHtmlWrapper.appendChild(container.firstChild);
      container.appendChild(katexHtmlWrapper);
    }

    const katexWrapper = document.createElement("span");
    katexWrapper.className = "katex";
    while (container.firstChild) katexWrapper.appendChild(container.firstChild);

    if (isDisplayMath) {
      const displayWrapper = document.createElement("span");
      displayWrapper.className = "katex-display";
      displayWrapper.appendChild(katexWrapper);
      container.appendChild(displayWrapper);
    } else {
      container.appendChild(katexWrapper);
    }
  }

  const raw = container.innerHTML || null;
  if (!raw) return null;
  return DOMPurify.sanitize(raw, {
    ALLOWED_TAGS: ["em", "strong", "sup", "sub", "span", "br", "code"],
    ALLOWED_ATTR: ["class", "style", "aria-hidden"]
  });
}

export interface SelectionValidation {
  disabled: boolean;
  reason: string | null;
}

/**
 * Manages the full lifecycle of creating an inline comment from a text
 * selection:
 *
 * 1. Tracking the browser selection
 * 2. Positioning the bubble menu
 * 3. Validating constraints (length, single-paragraph)
 * 4. Capturing anchor context (surrounding pre/post text)
 * 5. Applying a temporary highlight
 * 6. Tearing everything down on cancel
 */
export function useInlineCommentSelection() {
  const [selectionRect, setSelectionRect] = useState<DOMRect | null>(null);
  const [selectedText, setSelectedText] = useState("");
  const [crossesBlock, setCrossesBlock] = useState(false);

  const removeTempHighlight = useCallback(() => {
    CSS.highlights?.delete(HIGHLIGHT_NAME);
  }, []);

  const isMouseDownRef = useRef(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Whether the last committed selection showed the bubble menu. */
  const menuShownRef = useRef(false);

  // Core selection-tracking effect. Listens to selectionchange, mousedown,
  // mouseup, and scroll to maintain `selectionRect` and `selectedText`.
  // The bubble menu relies on these to decide whether and where to render.
  useEffect(() => {
    // The browser selection, its range and bounding rect, if it's a
    // non-empty selection in the publication body. Cheap: reads no text maps.
    const readRect = () => {
      const sel = window.getSelection();
      if (
        !sel ||
        sel.isCollapsed ||
        !sel.rangeCount ||
        sel.toString().trim().length === 0
      ) {
        return null;
      }

      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      if (!rect || (rect.width === 0 && rect.height === 0)) return null;

      const body = document.getElementById("publication-body");
      if (!body || !sel.anchorNode || !body.contains(sel.anchorNode)) {
        return null;
      }
      return { sel, range, rect, body };
    };

    const readSelection = (): SelectionState => {
      const read = readRect();
      if (!read) return NO_SELECTION;
      // Measured as the anchor will be saved, without formula MathML or
      // legend controls; null when there's nothing to anchor to
      const captured = captureAnchorContext(read.body, read.range);
      if (!captured) return NO_SELECTION;
      return {
        rect: read.rect,
        text: captured.text,
        crosses: selectionCrossesBlock(read.sel)
      };
    };

    const clearDebounce = () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };

    const hideMenu = () => {
      menuShownRef.current = false;
      setSelectionRect(null);
    };

    const commitSelection = () => {
      clearDebounce();
      hideMenu();
      debounceTimerRef.current = setTimeout(() => {
        const { rect, text, crosses } = readSelection();
        menuShownRef.current = rect != null;
        setSelectionRect(rect);
        setSelectedText(text);
        setCrossesBlock(crosses);
      }, DEBOUNCE_MS);
    };

    const onSelectionChange = () => {
      // While the user is still dragging, keep the menu hidden.
      if (isMouseDownRef.current) {
        hideMenu();
        return;
      }
      commitSelection();
    };

    const onMouseDown = () => {
      isMouseDownRef.current = true;
      clearDebounce();
      hideMenu();
    };

    const onMouseUp = () => {
      isMouseDownRef.current = false;
      commitSelection();
    };

    // Reposition a shown menu on scroll. Scrolling can't change the selected
    // text, so it's not read again.
    const onScroll = () => {
      if (isMouseDownRef.current || !menuShownRef.current) return;
      setSelectionRect(readRect()?.rect ?? null);
    };

    document.addEventListener("selectionchange", onSelectionChange);
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("mouseup", onMouseUp);
    window.addEventListener("scroll", onScroll, {
      capture: true,
      passive: true
    });
    // Text selected before hydration finished fired its events into the
    // void, so pick up whatever is already selected.
    commitSelection();

    return () => {
      clearDebounce();
      document.removeEventListener("selectionchange", onSelectionChange);
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("scroll", onScroll, { capture: true });
    };
  }, []);

  // Validates the current selection against length and single-paragraph constraints.
  const selectionValidation = useMemo<SelectionValidation>(() => {
    if (!selectedText) return { disabled: false, reason: null };

    const trimmed = selectedText.trim();

    if (trimmed.length > MAX_ANCHOR_LEN) {
      return {
        disabled: true,
        reason: `${trimmed.length} / ${MAX_ANCHOR_LEN} characters`
      };
    }

    if (crossesBlock) {
      return {
        disabled: true,
        reason:
          "Sorry, inline comments can only be added to text in the same paragraph."
      };
    }

    return { disabled: false, reason: null };
  }, [selectedText, crossesBlock]);

  // Snapshot the current browser selection, with up to 128 chars of context
  // either side, read from the rendered text comments are located in.
  const captureSelection = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) {
      return null;
    }
    if (!sel.toString().trim()) return null;

    const range = sel.getRangeAt(0);
    const body = document.getElementById("publication-body");
    const captured = body ? captureAnchorContext(body, range) : null;
    // Nothing a comment can anchor to, such as only a legend's toggle label
    if (!captured) return null;

    // Same text as `pre`/`post`, so it's found exactly; `sel.toString()`
    // can differ across a legend toggle or a formula
    const anchor = captured.text.slice(0, MAX_ANCHOR_LEN);
    const { pre, post } = captured;

    const isCode =
      range.commonAncestorContainer.parentElement?.closest("pre, code") !=
        null ||
      (range.commonAncestorContainer as Element).closest?.("pre, code") != null;

    // The selection's HTML would show the ellipsis or toggle label the
    // anchor leaves out, so the comment sheet shows the anchor text instead
    const anchorHtml = captured.stripped ? null : extractSelectionHtml(sel);

    return { anchor, pre, post, isCode, anchorHtml };
  }, []);

  // Captures the selection data, applies a CSS Custom Highlight to the
  // selected range, clears the native selection, and stores the result so
  // the comment form can reference it. Returns `null` if nothing is selected.
  const captureAndStoreSelection = useCallback(() => {
    const data = captureSelection();
    if (!data) return null;

    removeTempHighlight();
    const sel = window.getSelection();

    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0).cloneRange();

      if (CSS.highlights) {
        CSS.highlights.set(HIGHLIGHT_NAME, new Highlight(range));
      }

      sel.removeAllRanges();
    }

    // Cancel any pending debounce and eagerly clear `selectedText` so that the
    // debounced `commitSelection` (triggered by the `selectionchange` / `mouseup`
    // events above) becomes a no-op and doesn't cause a re-render mid-animation.
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    setSelectedText("");

    setSelectionRect(null);
    return data;
  }, [captureSelection, removeTempHighlight]);

  const resetCommentForm = useCallback(() => {
    removeTempHighlight();
  }, [removeTempHighlight]);

  return {
    selectionRect,
    selectionValidation,
    captureAndStoreSelection,
    resetCommentForm
  };
}
