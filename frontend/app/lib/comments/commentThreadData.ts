import { LEGEND_REST_CLASS } from "@/lib/truncatedLegends";
import { Comment, CommentThread } from "@/types";

/**
 * A comment thread paired with its computed vertical offset (px)
 * relative to the publication body container.
 */
export interface PositionedCommentThread {
  thread: CommentThread;
  y: number;
}

/**
 * Builds independent comment threads from a flat list of comments.
 *
 * A "root" is any comment with a non-empty `anchor_text`. Replies are
 * associated to their root by walking up the `parent_id` chain until a
 * root is found. Comments that are neither roots nor descendants of a root
 * are excluded.
 */
export function buildThreads(comments: Comment[]): CommentThread[] {
  const byId = new Map<number, Comment>();
  comments.forEach((c) => byId.set(c.comment_id, c));

  const rootMap = new Map<number, CommentThread>();

  comments.forEach((c) => {
    if (c.anchor_text && c.anchor_text.length > 0) {
      rootMap.set(c.comment_id, { root: c, replies: [] });
    }
  });

  comments.forEach((c) => {
    if (!c.parent_id) return;
    let current: Comment | undefined = c;
    while (current) {
      if (current.anchor_text && current.anchor_text.length > 0) {
        rootMap.get(current.comment_id)?.replies.push(c);
        break;
      }
      if (!current.parent_id) break;
      current = byId.get(current.parent_id);
    }
  });

  return Array.from(rootMap.values());
}

const BLOCK_ELEMENTS = new Set([
  "P",
  "DIV",
  "SECTION",
  "PUBLICATION",
  "BLOCKQUOTE",
  "LI",
  "TD",
  "TH",
  "H1",
  "H2",
  "H3",
  "H4",
  "H5",
  "H6",
  "FIGURE"
]);

/**
 * Resolve a comment ID to its DOM anchor element. When multiple threads
 * share the same highlighted text, only the first gets an `id="anchor-{id}"`
 * element. Others are found via the `data-comment-ids` attribute on the
 * shared wrapper.
 */
export function findAnchorElement(commentId: number): HTMLElement | null {
  return (
    document.getElementById(`anchor-${commentId}`) ??
    document.querySelector<HTMLElement>(
      `.comment-anchor-wrapper[data-comment-ids~="${commentId}"]`
    )
  );
}

/**
 * The truncated figure legend whose hidden text holds `anchor`, if any. The
 * anchor is out of sight until that legend expands.
 */
export function findCollapsedLegend(anchor: HTMLElement): HTMLElement | null {
  const rest = anchor.closest(`.${LEGEND_REST_CLASS}[hidden]`);
  return rest?.closest<HTMLElement>(".figure-legend") ?? null;
}

/**
 * The element a comment's bubble lines up with: its anchor, or, for an
 * anchor a truncated legend hides, that legend's "Read all" button.
 */
export function findBubbleTarget(anchor: HTMLElement): HTMLElement {
  const legend = findCollapsedLegend(anchor);
  if (!legend) return anchor;
  return legend.querySelector<HTMLElement>(".caption-read-all") ?? legend;
}

/** Find the closest block-level element containing the given element. */
export function findContainingBlock(element: HTMLElement): HTMLElement | null {
  let current: HTMLElement | null = element;
  while (current && current.id !== "publication-body") {
    if (BLOCK_ELEMENTS.has(current.tagName)) {
      return current;
    }
    current = current.parentElement;
  }
  return null;
}

export interface ParagraphGroup {
  paragraph: HTMLElement;
  threads: CommentThread[];
}

/**
 * Group threads by visual line position so that only highlights starting on
 * the same line of text share a bubble / sheet. Threads whose anchor Y
 * positions differ by more than `lineThreshold` px get separate groups.
 */
export function groupThreadsByLine(
  positionedThreads: PositionedCommentThread[],
  lineThreshold = 5
): ParagraphGroup[] {
  const groups: Array<{
    y: number;
    block: HTMLElement;
    threads: CommentThread[];
  }> = [];

  for (const pt of positionedThreads) {
    const anchorEl = findAnchorElement(pt.thread.root.comment_id);
    if (!anchorEl) continue;

    const block = findContainingBlock(anchorEl);
    if (!block) continue;

    const existing = groups.find((g) => Math.abs(g.y - pt.y) <= lineThreshold);
    if (existing) {
      existing.threads.push(pt.thread);
    } else {
      groups.push({ y: pt.y, block, threads: [pt.thread] });
    }
  }

  return groups.map((g) => ({ paragraph: g.block, threads: g.threads }));
}
