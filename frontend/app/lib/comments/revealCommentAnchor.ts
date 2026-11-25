import { openCollapsedAncestors } from "@/lib/collapsibles";
import { retryUntil } from "@/lib/commentNavigation";
import {
  findAnchorElement,
  findCollapsedLegend
} from "@/lib/comments/commentThreadData";
import { truncatedLegends } from "@/lib/truncatedLegends";

type RetryBudget = NonNullable<Parameters<typeof retryUntil>[1]>;

/**
 * How long to wait for the anchor to appear: about 1.2s, the budget the
 * page-level comment deep link retries with.
 */
const FIND_RETRY: RetryBudget = { maxAttempts: 8, delayMs: 150 };

/**
 * How long to wait for the anchor after expanding its legend: about 1s. It's
 * re-injected a frame after the expanded legend commits, so retry more often.
 */
const EXPANDED_ANCHOR_RETRY: RetryBudget = { maxAttempts: 20, delayMs: 50 };

/**
 * Scrolls an inline comment's highlighted text to the middle of the viewport.
 * A figure legend hiding the anchor past its truncation point is expanded,
 * and collapsed `<details>` around it are opened. Resolves false when there's
 * no anchor to scroll to, or when `signal` aborts first.
 *
 * Waits for the anchor to appear: on a deep link's first render the body may
 * still be loading, or its anchors not injected yet.
 */
export async function revealCommentAnchor(
  commentId: number,
  signal?: AbortSignal
) {
  const found = await waitFor(
    () => findAnchorElement(commentId),
    FIND_RETRY,
    signal
  );
  if (!found) return false;

  const legend = findCollapsedLegend(found);
  const anchor = legend ? await expand(legend, commentId, signal) : found;
  if (!anchor) return false;

  await openCollapsedAncestors(anchor);
  if (signal?.aborted || !anchor.isConnected) return false;
  anchor.scrollIntoView({ behavior: "smooth", block: "center" });
  return true;
}

/**
 * Expands a truncated legend, then waits for the comment's anchor to be
 * shown. Expanding re-injects the anchors, so the anchor is looked up anew.
 */
async function expand(
  legend: HTMLElement,
  commentId: number,
  signal: AbortSignal | undefined
) {
  truncatedLegends.get(legend)?.expand();
  return waitFor(
    () => {
      const anchor = findAnchorElement(commentId);
      return anchor && !findCollapsedLegend(anchor) ? anchor : null;
    },
    EXPANDED_ANCHOR_RETRY,
    signal
  );
}

/**
 * Resolves with what `find` returns once it isn't null, or null on giving up
 * or when `signal` aborts.
 */
async function waitFor<T>(
  find: () => T | null,
  budget: RetryBudget,
  signal: AbortSignal | undefined
): Promise<T | null> {
  if (signal?.aborted) return null;

  let result: T | null = null;
  const retry = retryUntil(() => (result = find()) != null, budget);
  signal?.addEventListener("abort", retry.cancel, { once: true });
  const succeeded = await retry.promise;
  signal?.removeEventListener("abort", retry.cancel);
  // An abort after `find` succeeded, but before this resumed, still counts:
  // the caller would otherwise expand a legend or open sections for a reveal
  // that has been cancelled
  if (signal?.aborted) return null;
  return succeeded ? result : null;
}
