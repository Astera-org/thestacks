import { useLayoutEffect } from "react";
import { useLocation } from "react-router";

let committed: { key: string; hashTargetFound: boolean } | null = null;

function findHashTarget(hash: string) {
  if (hash.length <= 1) return null;
  try {
    return document.getElementById(decodeURIComponent(hash.slice(1)));
  } catch {
    return null;
  }
}

/**
 * Records, for the location React last committed, whether its hash target was
 * in the DOM then, which is when ScrollRestoration looks for it. Call it above
 * every route, so it runs after their layout effects.
 */
export function useTrackCommittedLocation() {
  const { key, hash } = useLocation();
  useLayoutEffect(() => {
    committed = { key, hashTargetFound: findHashTarget(hash) != null };
  }, [key, hash]);
}

/**
 * Whether ScrollRestoration has already handled the location `key` without
 * finding its hash target, which then has to be scrolled to once it renders.
 */
export function didMissHashTarget(key: string) {
  return committed?.key === key && !committed.hashTargetFound;
}
