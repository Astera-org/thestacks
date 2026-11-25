const FLASH_CLASS = "collapsible-target-flash";
const SCROLL_SETTLE_MS = 100;

/**
 * Opens any collapsed sections hiding `element`, `element` included when it is
 * one. A scroll started meanwhile stops short against a page that hasn't grown
 * yet, so once they've expanded this scrolls again, then flashes the target to
 * point out content the reader hadn't seen.
 */
export async function revealTarget(element: HTMLElement) {
  if (!(await openCollapsedAncestors(element))) return;

  element.scrollIntoView({ behavior: "smooth", block: "start" });
  onScrollSettled(async () => {
    element.classList.add(FLASH_CLASS);
    await settle(element.getAnimations());
    element.classList.remove(FLASH_CLASS);
  });
}

/**
 * Opens the collapsed `<details>` around `element`, `element` included, and
 * resolves once they've finished expanding: true if any were collapsed.
 */
export async function openCollapsedAncestors(element: HTMLElement) {
  const collapsed: HTMLDetailsElement[] = [];
  let details = element.closest("details");
  while (details) {
    if (!details.open) collapsed.push(details);
    details = details.parentElement?.closest("details") ?? null;
  }
  if (collapsed.length === 0) return false;

  for (const d of collapsed) d.open = true;
  await settle(collapsed.flatMap((d) => d.getAnimations({ subtree: true })));
  return true;
}

const settle = (animations: Animation[]) =>
  Promise.allSettled(animations.map((a) => a.finished));

// Debounced `scroll` rather than `scrollend`, which Safari lacks.
function onScrollSettled(callback: () => void) {
  let timer = setTimeout(done, SCROLL_SETTLE_MS);
  function handleScroll() {
    clearTimeout(timer);
    timer = setTimeout(done, SCROLL_SETTLE_MS);
  }
  function done() {
    window.removeEventListener("scroll", handleScroll);
    callback();
  }
  window.addEventListener("scroll", handleScroll, { passive: true });
}
