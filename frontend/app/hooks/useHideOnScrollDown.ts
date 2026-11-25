import { useEffect, useSyncExternalStore } from "react";
import { useLocation } from "react-router";

// Always reveal when within this many px of the top of the page.
const REVEAL_AT_TOP = 80;
// Minimum scroll delta before toggling visibility. High enough to ignore
// trackpad inertia tails so the nav doesn't twitch while coasting, low
// enough that one mouse-wheel notch triggers a hide.
const SCROLL_DELTA = 48;

// Module-level, not per-component: the navbar, sticky banner and mobile TOC bar
// position themselves relative to each other, and the navbar never remounts while
// the others do, so separate state let them disagree after a route change.
let hidden = false;
let lastScrollY = 0;
// While true, the next scroll event is a restoration jump rather than a gesture.
let ignoreNextDelta = false;

const listeners = new Set<() => void>();

function setHidden(next: boolean) {
  if (hidden === next) return;
  hidden = next;
  listeners.forEach((listener) => listener());
}

function handleScroll() {
  const currentY = window.scrollY;

  if (ignoreNextDelta) {
    lastScrollY = currentY;
    return;
  }

  // Near the top: always reveal, and refresh the baseline.
  if (currentY < REVEAL_AT_TOP) {
    lastScrollY = currentY;
    setHidden(false);
    return;
  }

  const diff = currentY - lastScrollY;
  if (Math.abs(diff) < SCROLL_DELTA) return;

  lastScrollY = currentY;
  setHidden(diff > 0);
}

function subscribe(listener: () => void) {
  if (listeners.size === 0) {
    // Seed from the actual position so a late-mounting consumer doesn't think
    // the user just scrolled from 0 to wherever they are.
    lastScrollY = window.scrollY;
    window.addEventListener("scroll", handleScroll, { passive: true });
  }

  listeners.add(listener);

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      window.removeEventListener("scroll", handleScroll);
    }
  };
}

/**
 * Returns `true` while the user is scrolling down past the top of the page,
 * `false` when scrolling up or near the top. Intended for nav-like elements
 * that collapse on downward scroll and reveal on upward scroll.
 */
export function useHideOnScrollDown() {
  return useSyncExternalStore(
    subscribe,
    () => hidden,
    () => false
  );
}

/** Reveals on every route load and resyncs the baseline. Call once, from the root layout. */
export function useRevealNavOnRouteChange() {
  const { key } = useLocation();

  useEffect(() => {
    ignoreNextDelta = true;
    setHidden(false);

    // Scroll restoration runs in a layout effect, so the final position is only
    // known next frame. Without this resync the jump reads as a scroll down.
    const frame = requestAnimationFrame(() => {
      lastScrollY = window.scrollY;
      ignoreNextDelta = false;
      setHidden(false);
    });

    return () => cancelAnimationFrame(frame);
  }, [key]);
}
