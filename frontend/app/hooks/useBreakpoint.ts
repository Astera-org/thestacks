import { BREAKPOINTS, type Breakpoint } from "@/lib/constants";
import { useCallback, useSyncExternalStore } from "react";

/**
 * True when the viewport is at least `breakpoint` wide (min-width), e.g.
 * `useBreakpoint("md")` from 768px up. matchMedia-backed, so it re-renders only
 * on breakpoint crossings. SSR/first paint is always `true` (assume the wide
 * layout so desktop does not flash the mobile view); it flips to the real value
 * on hydration.
 */
export function useBreakpoint(breakpoint: Breakpoint): boolean {
  const query = `(min-width: ${BREAKPOINTS[breakpoint]}px)`;

  const subscribe = useCallback(
    (onChange: () => void) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    [query]
  );

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => true
  );
}
