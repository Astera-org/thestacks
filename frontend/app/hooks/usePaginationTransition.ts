import { useCallback, useEffect } from "react";
import { useLocation } from "react-router";

const LIST_ANCHOR = "[data-vt-list-anchor]";

function isViewTransitionActive() {
  try {
    return document.documentElement.matches(":active-view-transition");
  } catch {
    return false;
  }
}

/**
 * Tags the direction of a page change on `<html>` so view-transitions.css can
 * animate only the results list instead of fading the whole page.
 *
 * Glides to the list and navigates once the scroll settles. Snapshots are
 * positioned against the viewport at capture time, so scrolling during the
 * transition misaligns them.
 */
export function usePaginationTransition() {
  return useCallback((direction: "next" | "prev", goToPage: () => void) => {
    const start = () => {
      document.documentElement.dataset.vtPage = direction;
      goToPage();
    };

    const anchor = document.querySelector(LIST_ANCHOR);
    if (!anchor) return start();

    const margin = parseFloat(getComputedStyle(anchor).scrollMarginTop) || 0;
    if (Math.abs(anchor.getBoundingClientRect().top - margin) < 2) {
      return start();
    }

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    anchor.scrollIntoView({
      block: "start",
      behavior: prefersReducedMotion ? "auto" : "smooth"
    });

    // Navigate once the glide settles. Polling instead of `scrollend`, which
    // Safari lacks; the time cap covers an interrupted scroll.
    let lastY = window.scrollY;
    let stillFrames = 0;
    const startedAt = performance.now();

    const tick = () => {
      const y = window.scrollY;
      stillFrames = y === lastY ? stillFrames + 1 : 0;
      lastY = y;

      if (stillFrames >= 3 || performance.now() - startedAt > 1200) {
        return start();
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, []);
}

/** Clears the direction tag once the transition ends. Call once, from the root layout. */
export function usePaginationTransitionEnd() {
  const { key } = useLocation();

  useEffect(() => {
    const root = document.documentElement;
    if (!root.dataset.vtPage) return;

    let frame = 0;
    const startedAt = performance.now();

    // Clearing the tag mid-transition un-matches every `html[data-vt-page]`
    // rule, re-arming the default root fade on the still-alive pseudos.
    const tick = () => {
      if (!isViewTransitionActive() || performance.now() - startedAt > 3000) {
        delete root.dataset.vtPage;
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frame);
  }, [key]);
}
