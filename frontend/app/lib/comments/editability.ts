import { Comment } from "@/types";

const EDIT_WINDOW_MS = 60 * 60 * 1000;

export type CommentEditability =
  | { canEdit: false; reason: "window_closed" | "has_replies" }
  | { canEdit: true; timeRemaining: number };

export function getCommentEditability(
  comment: Comment,
  hasReplies: boolean,
  now?: number
): CommentEditability {
  if (hasReplies) {
    return { canEdit: false, reason: "has_replies" };
  }

  const elapsed = (now ?? Date.now()) - new Date(comment.created_at).getTime();
  const timeRemaining = EDIT_WINDOW_MS - elapsed;

  if (timeRemaining <= 0) {
    return { canEdit: false, reason: "window_closed" };
  }

  return { canEdit: true, timeRemaining };
}

/** Below this, the countdown shows seconds and is highlighted as urgent. */
export const EDIT_WINDOW_WARNING_MS = 5 * 60 * 1000;

export function formatTimeRemaining(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  if (ms > EDIT_WINDOW_WARNING_MS) return `${minutes}m`;
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds}s`;
}

export function formatTimeRemainingShort(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  if (minutes >= 1) return `${minutes}m left`;
  return `${totalSeconds}s left`;
}
