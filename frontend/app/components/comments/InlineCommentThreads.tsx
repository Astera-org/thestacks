import CommentAuthProvider from "@/components/comments/CommentAuthProvider";
import InlineCommentThreadsSheet from "@/components/comments/InlineCommentThreadsSheet";
import { useAnchorPositioning } from "@/hooks/useAnchorPositioning";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { useHighlightManagement } from "@/hooks/useHighlightManagement";
import { useRevealCommentAnchor } from "@/hooks/useRevealCommentAnchor";
import {
  buildThreads,
  findAnchorElement,
  findCollapsedLegend
} from "@/lib/comments/commentThreadData";
import { cn } from "@/lib/utils";
import { Comment, CommentThread } from "@/types";
import { MessageCircle } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router";

interface InlineCommentThreadsProps {
  publicationId: number;
  comments: Comment[];
  contributors?: Array<{ user_id: number; roles: string[] }>;
  /** When set, auto-open the sheet containing this comment and scroll the body to its anchor. */
  deepLinkCommentId?: number;
  /** Called after the deep-link has been consumed so the parent can clear the ID. */
  onDeepLinkConsumed?: () => void;
}

interface InlineCommentSheetToggleProps {
  threads: CommentThread[];
  onClick: () => void;
  onHoverChange: (hovering: boolean) => void;
}

/**
 * Small pill button (icon + count) positioned to the right of text that has inline comments.
 */
function InlineCommentSheetToggle(props: InlineCommentSheetToggleProps) {
  const { threads, onClick, onHoverChange } = props;

  const totalComments = threads.reduce(
    (sum, t) => sum + t.replies.length + 1,
    0
  );

  if (threads.length === 0) return null;

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => onHoverChange(true)}
      onMouseLeave={() => onHoverChange(false)}
      className={cn(
        "border-gray-blue-100 bg-surface flex items-center justify-center gap-1 rounded-md border px-2 py-1 transition-colors hover:bg-gray-100",
        totalComments > 9 ? "min-w-11" : "min-w-10"
      )}
      aria-label={`View ${totalComments} comment${totalComments > 1 ? "s" : ""}`}
      data-testid={`toggle-inline-comment-sheet-button-${threads[0].root.comment_id}`}
    >
      <MessageCircle size={12} className="text-fg fill-fg shrink-0" />
      <div className="text-fg text-xs font-medium">{totalComments}</div>
    </button>
  );
}

/**
 * Renders the margin comment-count bubbles alongside the publication body and
 * manages the thread sheet that opens when a bubble is clicked. Handles anchor
 * positioning, highlight toggling on hover/open, and mobile vs. desktop layout.
 */
export default function InlineCommentThreads(props: InlineCommentThreadsProps) {
  const {
    publicationId,
    comments,
    contributors,
    deepLinkCommentId,
    onDeepLinkConsumed
  } = props;
  const isMd = useBreakpoint("md");
  const { pathname } = useLocation();
  const revealAnchor = useRevealCommentAnchor();

  const { paragraphGroups, tops, anchorVersion, containerRef } =
    useAnchorPositioning(comments, pathname, !isMd);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetThreadRootIds, setSheetThreadRootIds] = useState<number[]>([]);
  const [scrollToCommentId, setScrollToCommentId] = useState<
    number | undefined
  >();

  const allThreads = useMemo(() => buildThreads(comments), [comments]);

  const sheetThreads = useMemo(() => {
    if (sheetThreadRootIds.length === 0) return [];
    const idSet = new Set(sheetThreadRootIds);
    return allThreads.filter((t) => idSet.has(t.root.comment_id));
  }, [sheetThreadRootIds, allThreads]);

  // Deep-link: find the thread containing the target comment and open the sheet.
  // Fires once and signals the parent to clear the ID so it won't re-trigger
  // when `allThreads` recomputes (e.g. after a new comment is posted).
  useEffect(() => {
    if (deepLinkCommentId == null) return;

    const thread = allThreads.find(
      (t) =>
        t.root.comment_id === deepLinkCommentId ||
        t.replies.some((r) => r.comment_id === deepLinkCommentId)
    );
    if (!thread) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: deep-link from URL hash
    setSheetThreadRootIds([thread.root.comment_id]);
    setScrollToCommentId(deepLinkCommentId);
    setSheetOpen(true);
    onDeepLinkConsumed?.();
    void revealAnchor(thread.root.comment_id);
  }, [deepLinkCommentId, allThreads, onDeepLinkConsumed, revealAnchor]);

  const handleBubbleClick = useCallback(
    (groupThreads: CommentThread[]) => {
      setSheetThreadRootIds(groupThreads.map((t) => t.root.comment_id));
      setScrollToCommentId(undefined);
      setSheetOpen(true);

      // A bubble for text a collapsed legend hides sits at its "Read all":
      // expand the legend to show the text
      const rootId = groupThreads[0].root.comment_id;
      const anchor = findAnchorElement(rootId);
      if (anchor && findCollapsedLegend(anchor)) void revealAnchor(rootId);
    },
    [revealAnchor]
  );

  const handleNewThreadCreated = useCallback((newComment: Comment) => {
    setSheetThreadRootIds((prev) => [...prev, newComment.comment_id]);
  }, []);

  const { toggleHighlightForThreads } = useHighlightManagement(
    paragraphGroups,
    anchorVersion,
    !isMd,
    sheetOpen,
    sheetThreads,
    handleBubbleClick
  );

  if (paragraphGroups.length === 0) return null;

  return (
    <CommentAuthProvider>
      <div className="w-full" ref={containerRef}>
        {isMd &&
          paragraphGroups.map(({ threads: groupThreads }) => {
            const paragraphKey = groupThreads[0].root.comment_id;
            const top = tops[paragraphKey] || 0;

            return (
              <div
                key={paragraphKey}
                className="absolute right-full mr-4"
                style={{ top: `${top}px` }}
                id={`paragraph-group-${paragraphKey}`}
              >
                <InlineCommentSheetToggle
                  threads={groupThreads}
                  onClick={() => handleBubbleClick(groupThreads)}
                  onHoverChange={(hovering) =>
                    toggleHighlightForThreads(groupThreads, hovering)
                  }
                />
              </div>
            );
          })}

        <InlineCommentThreadsSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          threads={sheetThreads}
          publicationId={publicationId}
          contributors={contributors}
          onNewThreadCreated={handleNewThreadCreated}
          scrollToCommentId={scrollToCommentId}
        />
      </div>
    </CommentAuthProvider>
  );
}
