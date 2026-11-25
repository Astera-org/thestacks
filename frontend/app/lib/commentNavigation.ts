import type { Comment } from "@/types";

export const COMMENT_ID_HASH_REGEX = /^comment-(.+)$/;

export type CommentLinkTarget =
  | { kind: "page-level-root"; comment: Comment }
  | { kind: "page-level-reply"; comment: Comment; rootId: number }
  | { kind: "inline-root"; comment: Comment }
  | { kind: "inline-reply"; comment: Comment; rootId: number };

/**
 * Classify a deep-linked comment by walking the `parent_id` chain to find the
 * root, then checking whether the root has `anchor_text` (inline) or not
 * (page-level).
 */
export function classifyLinkedComment(
  commentId: number,
  comments: Comment[]
): CommentLinkTarget | null {
  const byId = new Map<number, Comment>();
  for (const c of comments) byId.set(c.comment_id, c);

  const target = byId.get(commentId);
  if (!target) return null;

  let root = target;
  while (root.parent_id != null) {
    const parent = byId.get(root.parent_id);
    if (!parent) break;
    root = parent;
  }

  const isInline = Boolean(root.anchor_text?.trim());
  const isReply = target.comment_id !== root.comment_id;

  if (isInline) {
    return isReply
      ? { kind: "inline-reply", comment: target, rootId: root.comment_id }
      : { kind: "inline-root", comment: target };
  }
  return isReply
    ? { kind: "page-level-reply", comment: target, rootId: root.comment_id }
    : { kind: "page-level-root", comment: target };
}

export function commentIdToHash(commentId: string | number) {
  return `comment-${commentId}`;
}

/** Parses `#comment-<id>` (leading `#` optional); null for any other hash. */
export function parseCommentIdFromHash(hash: string): number | null {
  const match = COMMENT_ID_HASH_REGEX.exec(hash.replace(/^#/, ""));
  if (!match) return null;

  const commentId = Number(match[1]);
  return Number.isInteger(commentId) ? commentId : null;
}

// ---------------------------------------------------------------------------
// Retry utility
// ---------------------------------------------------------------------------

interface RetryHandle {
  promise: Promise<boolean>;
  cancel: () => void;
}

/**
 * Repeatedly invoke `action` until it returns `true` or attempts are exhausted.
 * Returns a handle with a cancellable promise so callers (especially React
 * effects) can tear down in-flight retry chains on cleanup. Cancelling
 * resolves the promise with `false`.
 */
export function retryUntil(
  action: () => boolean,
  {
    maxAttempts = 8,
    delayMs = 150
  }: { maxAttempts?: number; delayMs?: number } = {}
): RetryHandle {
  let timeout: ReturnType<typeof setTimeout>;
  let cancelled = false;
  let settle: (succeeded: boolean) => void = () => {};

  const promise = new Promise<boolean>((resolve) => {
    settle = resolve;
    let attempt = 0;

    function tick() {
      if (cancelled) return;
      attempt++;
      if (action()) {
        resolve(true);
        return;
      }
      if (attempt < maxAttempts) {
        timeout = setTimeout(tick, delayMs);
      } else {
        resolve(false);
      }
    }

    tick();
  });

  return {
    promise,
    cancel: () => {
      cancelled = true;
      clearTimeout(timeout);
      settle(false);
    }
  };
}

// ---------------------------------------------------------------------------
// Scroll helpers
// ---------------------------------------------------------------------------

export function scrollToCommentById(commentId: string | number) {
  const targetComment = document.querySelector<HTMLElement>(
    `[data-comment-id="${commentId}"]`
  );
  if (!targetComment) return false;

  // CollapsibleContainer always renders children in the DOM, hiding them with
  // opacity-0 when collapsed. Scrolling to such an element lands at the
  // container's position (top of the section) instead of the element's intended
  // position. Return false so the retry loop can succeed after React opens the
  // container.
  if (
    typeof targetComment.checkVisibility === "function" &&
    !targetComment.checkVisibility({ opacityProperty: true })
  ) {
    return false;
  }

  targetComment.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });

  return true;
}

/**
 * Retry `scrollToCommentById` with short delays to wait for the DOM element
 * to appear after React re-renders (e.g. reply expansion or sheet opening).
 * Returns a cancellable handle for use in effect cleanups.
 */
export function scrollToCommentByIdWithRetry(
  commentId: string | number,
  maxAttempts = 8,
  delayMs = 150
): RetryHandle {
  return retryUntil(() => scrollToCommentById(commentId), {
    maxAttempts,
    delayMs
  });
}
