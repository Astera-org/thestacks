import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";

// Duration scales with the distance animated so tall sections don't whip
// open, clamped so short content isn't sluggish nor tall content slow.
const MS_PER_PX = 0.5;
const MIN_DURATION_MS = 250;
const MAX_DURATION_MS = 600;
const EASING = "cubic-bezier(0.4, 0, 0.2, 1)";

const getDuration = (distance: number) =>
  Math.round(
    Math.min(MAX_DURATION_MS, Math.max(MIN_DURATION_MS, distance * MS_PER_PX))
  );

// Collapsed state for the server render and first paint, before the effect
// takes over. React only renders a boolean `hidden`; the effect upgrades it to
// `until-found` after hydration. Kept constant so React never re-applies it.
const COLLAPSED_PROPS = {
  hidden: true,
  style: { overflow: "hidden", height: "0px" }
};

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

interface CollapsibleRegionProps {
  /** Target of the trigger's `aria-controls`. */
  id: string;
  isOpen: boolean;
  /** Called when in-page search reveals the collapsed content. */
  onOpenChange?: (isOpen: boolean) => void;
  children: React.ReactNode;
  /** Applied to the inner wrapper, the element whose height is measured. */
  className?: string;
}

/**
 * Animated disclosure region. The trigger belongs to the caller, which owns
 * its markup and wires `aria-expanded` plus `aria-controls={id}` to it.
 *
 * Collapsed content stays in the DOM as `hidden="until-found"` so in-page
 * search (Ctrl/Cmd+F) can match it; a match fires `beforematch`, which reveals
 * the content and reports the section open. `until-found` applies
 * `content-visibility: hidden`, whose size containment holds the region at
 * zero height while collapsed.
 *
 * Expanding and collapsing animate an explicit pixel height (Web Animations
 * API). The animated range is clamped to what can actually be seen, the
 * bottom of the nearest scrolling ancestor and of the viewport, so a long
 * region inside a capped scroller doesn't spend most of its curve on rows
 * below the fold. The height past that point is added or removed instantly
 * where it can't be seen. At rest the region has no inline height.
 */
export default function CollapsibleRegion({
  id,
  isOpen,
  onOpenChange,
  children,
  className
}: CollapsibleRegionProps) {
  // Snapshot for the first render only. These props must never change: if
  // they did, React would rewrite `hidden`/`style` over the effect's changes.
  const [initiallyOpen] = useState(isOpen);
  const contentRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const didMount = useRef(false);
  // Set when a find-in-page match revealed the content, so we snap open rather
  // than replay the collapse-then-expand animation.
  const skipOpenAnimation = useRef(isOpen);

  useEffect(() => {
    const el = contentRef.current;
    const inner = innerRef.current;
    if (!el || !inner) return;

    // First paint: the initial render already matches state. React can only
    // render `hidden` as a boolean, so make collapsed content findable here.
    if (!didMount.current) {
      didMount.current = true;
      if (!isOpen) el.setAttribute("hidden", "until-found");
      return;
    }

    // If a previous animation was interrupted, its cleanup committed the
    // in-flight height as an inline style. Start from there so reversing
    // mid-animation is smooth, then clear it so we can measure naturally.
    const interruptedHeight = parseFloat(el.style.height);
    el.style.height = "";

    if (isOpen) {
      el.removeAttribute("hidden");
      if (skipOpenAnimation.current || prefersReducedMotion()) {
        skipOpenAnimation.current = false;
        el.style.overflow = "";
        return;
      }
      // Laid out again with no inline height, so this is the real content
      // height, including children that only mount on open. Only animate as
      // far as will be visible once a capped scroller has grown to its max.
      const target = Math.min(el.offsetHeight, visibleExtent(el, true));
      const from = Number.isNaN(interruptedHeight) ? 0 : interruptedHeight;
      return animateHeight(el, from, target, () => {
        // Back to natural height (the rest lands below the fold), unclipped
        // so open content can bleed past the parent's padding.
        el.style.overflow = "";
      });
    }

    skipOpenAnimation.current = false;
    const close = () => {
      // Mark findable once collapsed; `until-found` now holds it at zero.
      el.setAttribute("hidden", "until-found");
      el.style.overflow = "";
    };
    if (prefersReducedMotion()) {
      close();
      return;
    }
    // Trim to the visible part first. That's invisible (only rows past the
    // fold go), and it leaves the scroll position valid, then animate the rest.
    const from = Number.isNaN(interruptedHeight)
      ? Math.min(el.offsetHeight, visibleExtent(el, false))
      : interruptedHeight;
    return animateHeight(el, from, 0, close);
  }, [isOpen]);

  // A find-in-page match fires `beforematch`; sync state open as the browser reveals it.
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const handleBeforeMatch = () => {
      skipOpenAnimation.current = true;
      el.style.height = "";
      el.style.overflow = "";
      onOpenChange?.(true);
    };
    el.addEventListener("beforematch", handleBeforeMatch);
    return () => el.removeEventListener("beforematch", handleBeforeMatch);
  }, [onOpenChange]);

  return (
    // `flow-root` keeps child margins inside the region so the measured height
    // matches what's rendered, both while clipped and at rest. Paper can't be
    // expanded, so collapsed content prints open.
    <div
      id={id}
      ref={contentRef}
      className="flow-root print:block! print:h-auto! print:overflow-visible! print:[content-visibility:visible]!"
      {...(initiallyOpen ? {} : COLLAPSED_PROPS)}
    >
      <div ref={innerRef} className={cn(className)}>
        {children}
      </div>
    </div>
  );
}

/**
 * Animates `el`'s height from `from` to `to` pixels, clipping while it runs,
 * and calls `onDone` when it completes. Returns a cleanup that, if the
 * animation is interrupted, commits the in-flight height as an inline style
 * so the next animation can pick up from it.
 */
function animateHeight(
  el: HTMLElement,
  from: number,
  to: number,
  onDone: () => void
) {
  const distance = Math.abs(to - from);
  if (distance < 1) {
    onDone();
    return;
  }
  el.style.overflow = "hidden";
  let finished = false;
  const animation = el.animate(
    [{ height: `${from}px` }, { height: `${to}px` }],
    { duration: getDuration(distance), easing: EASING, fill: "forwards" }
  );
  animation.onfinish = () => {
    finished = true;
    animation.cancel();
    onDone();
  };
  return () => {
    if (finished) return;
    try {
      animation.commitStyles();
    } catch {
      // Element isn't rendered; nothing to carry over.
    }
    animation.cancel();
  };
}

/**
 * How far below `el`'s top edge can be seen: up to the bottom of the nearest
 * scrolling ancestor and of the viewport, whichever is higher. With `growing`,
 * a scroller capped by `max-height` is measured at that cap, since expanding
 * the region grows it until it hits the cap.
 */
function visibleExtent(el: HTMLElement, growing: boolean): number {
  let bottom = window.innerHeight;
  const scroller = getScrollParent(el);
  if (scroller) {
    const rect = scroller.getBoundingClientRect();
    const maxHeight = growing
      ? parseFloat(getComputedStyle(scroller).maxHeight)
      : NaN;
    bottom = Math.min(
      bottom,
      Number.isNaN(maxHeight)
        ? rect.top + scroller.clientTop + scroller.clientHeight
        : rect.top + maxHeight
    );
  }
  return Math.max(0, bottom - el.getBoundingClientRect().top);
}

function getScrollParent(el: HTMLElement): HTMLElement | null {
  for (let node = el.parentElement; node; node = node.parentElement) {
    const { overflowY } = getComputedStyle(node);
    if (overflowY === "auto" || overflowY === "scroll") return node;
  }
  return null;
}
