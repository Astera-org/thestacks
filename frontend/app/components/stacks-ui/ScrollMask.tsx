import { cn } from "@/lib/utils";
import { Slot } from "@radix-ui/react-slot";
import { useEffect, useRef, type ComponentProps } from "react";

type ScrollMaskProps = ComponentProps<"div"> & {
  /** Scroll direction to fade. Defaults to `horizontal`. */
  axis?: "horizontal" | "vertical";
  /** How far each fade reaches in from an edge (any CSS length). */
  fadeSize?: string;
  /** Apply to the single child element instead of a wrapping div. */
  asChild?: boolean;
};

/**
 * Scroll container that fades whichever edge still has content past it, hinting
 * the area can scroll. The mask is recomputed imperatively on scroll/resize (no
 * re-render); only edges that can actually scroll fade, so a container that fits
 * its content shows nothing. Use `asChild` to mask an existing element (e.g. a
 * Radix list) rather than a wrapping div.
 */
export function ScrollMask({
  axis = "horizontal",
  fadeSize = "2rem",
  asChild,
  className,
  ...props
}: ScrollMaskProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const horizontal = axis === "horizontal";

    const update = () => {
      const scrolled = horizontal ? el.scrollLeft : el.scrollTop;
      const scrollSize = horizontal ? el.scrollWidth : el.scrollHeight;
      const clientSize = horizontal ? el.clientWidth : el.clientHeight;

      // 1px slack absorbs sub-pixel rounding at the extremes.
      const fadeStart = scrolled > 1;
      const fadeEnd = scrolled + clientSize < scrollSize - 1;

      const mask = `linear-gradient(${horizontal ? "to right" : "to bottom"}, ${
        fadeStart ? "transparent" : "black"
      } 0, black ${fadeSize}, black calc(100% - ${fadeSize}), ${
        fadeEnd ? "transparent" : "black"
      } 100%)`;

      el.style.setProperty("mask-image", mask);
      el.style.setProperty("-webkit-mask-image", mask);
    };

    update();
    el.addEventListener("scroll", update, { passive: true });

    // Catches container resizes that flip whether either edge can scroll.
    const observer = new ResizeObserver(update);
    observer.observe(el);

    return () => {
      el.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, [axis, fadeSize]);

  const Comp = asChild ? Slot : "div";

  return (
    <Comp
      className={cn(
        axis === "horizontal"
          ? "scrollbar-invisible overflow-x-auto"
          : "overflow-y-auto",
        className
      )}
      {...props}
      ref={ref}
    />
  );
}
