const INSTANT_SCROLL_MS = 1000;

/**
 * Gives a key to a history entry the browser created on its own (the first
 * page load, a hash typed in the URL bar). React Router keys them all
 * "default", so ScrollRestoration would restore one entry's scroll position on
 * another instead of scrolling to the new hash's target.
 *
 * Returns whether the entry needed a key.
 */
function keyBrowserHistoryEntry() {
  if (window.history.state?.key) return false;
  window.history.replaceState(
    { ...window.history.state, key: Math.random().toString(36).slice(2, 10) },
    ""
  );
  return true;
}

/**
 * Keys the current history entry, and every entry the browser creates later.
 * Call before hydration, so the popstate listener runs before React Router's.
 */
export function keyBrowserHistoryEntries() {
  keyBrowserHistoryEntry();

  let timer: ReturnType<typeof setTimeout> | undefined;
  window.addEventListener("popstate", () => {
    if (!keyBrowserHistoryEntry()) return;
    // The browser scrolls to the new hash's target and ScrollRestoration then
    // scrolls to it again; two smooth scrolls in a row stop short of it or
    // overshoot. Jump instead, as during page transitions (view-transitions.css).
    const root = document.documentElement;
    root.dataset.instantScroll = "";
    clearTimeout(timer);
    timer = setTimeout(
      () => delete root.dataset.instantScroll,
      INSTANT_SCROLL_MS
    );
  });
}
