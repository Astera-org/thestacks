import { ParagraphGroup } from "@/lib/comments/commentThreadData";
import { CommentThread } from "@/types";
import { useCallback, useEffect, useState } from "react";

export function useHighlightManagement(
  paragraphGroups: ParagraphGroup[],
  anchorVersion: number,
  isMobile: boolean,
  sheetOpen: boolean,
  sheetThreads: CommentThread[],
  handleBubbleClick: (groupThreads: CommentThread[]) => void
) {
  const [hoveredIds, setHoveredIds] = useState<ReadonlySet<string>>(
    () => new Set()
  );

  // Switching to mobile unmounts the bubbles without a mouse leave
  const [wasMobile, setWasMobile] = useState(isMobile);
  if (isMobile !== wasMobile) {
    setWasMobile(isMobile);
    if (isMobile) setHoveredIds(new Set());
  }

  // Hover only: un-hovering always clears it, as the open sheet's comments are
  // kept lit by `sheetThreads`, even when the sheet's overlay ends the hover
  const toggleHighlightForThreads = useCallback(
    (groupThreads: CommentThread[], on: boolean) =>
      setHoveredIds((prev) => {
        const next = new Set(prev);
        for (const t of groupThreads) {
          const id = String(t.root.comment_id);
          if (on) next.add(id);
          else next.delete(id);
        }
        return next;
      }),
    []
  );

  // On mobile, always show highlights for all comment anchors.
  useEffect(() => {
    if (!isMobile) return;
    const anchors = document.querySelectorAll<HTMLElement>(
      ".comment-anchor-wrapper"
    );
    anchors.forEach((el) => el.classList.add("bg-highlight/70"));
    return () => {
      anchors.forEach((el) => el.classList.remove("bg-highlight/70"));
    };
  }, [isMobile, anchorVersion]);

  // On mobile, open the sheet when highlighted anchor text is tapped.
  useEffect(() => {
    if (!isMobile) return;

    const commentToGroup = new Map<string, CommentThread[]>();
    paragraphGroups.forEach(({ threads: groupThreads }) => {
      groupThreads.forEach((t) => {
        commentToGroup.set(String(t.root.comment_id), groupThreads);
      });
    });

    const handleClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest(
        ".comment-anchor-wrapper"
      ) as HTMLElement | null;
      if (!target) return;
      const ids = target.dataset.commentIds;
      if (!ids) return;
      const firstId = ids.split(" ").find((id) => commentToGroup.has(id));
      if (!firstId) return;
      handleBubbleClick(commentToGroup.get(firstId)!);
    };

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [isMobile, paragraphGroups, handleBubbleClick]);

  // Desktop: highlight the hovered and open-sheet comments, per wrapper, so a
  // piece comments share stays lit while any of them is active. Re-applied
  // when re-injection (e.g. a legend expanding) replaces the wrappers.
  useEffect(() => {
    if (isMobile) return;
    const active = new Set(hoveredIds);
    if (sheetOpen) {
      sheetThreads.forEach((t) => active.add(String(t.root.comment_id)));
    }
    if (active.size === 0) return;

    const wrappers = document.querySelectorAll<HTMLElement>(
      ".comment-anchor-wrapper"
    );
    wrappers.forEach((el) => {
      const ids = el.dataset.commentIds?.split(" ") ?? [];
      el.classList.toggle(
        "bg-highlight/70",
        ids.some((id) => active.has(id))
      );
    });
    return () => {
      wrappers.forEach((el) => el.classList.remove("bg-highlight/70"));
    };
  }, [isMobile, hoveredIds, sheetOpen, sheetThreads, anchorVersion]);

  return { toggleHighlightForThreads };
}
