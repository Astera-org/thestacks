import { useScrollToAnchorLink } from "@/hooks/useScrollToAnchorLink";
import {
  classifyLinkedComment,
  COMMENT_ID_HASH_REGEX,
  scrollToCommentByIdWithRetry
} from "@/lib/commentNavigation";
import type { Comment } from "@/types";
import { useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router";

/**
 * Manages collapsible section open/close state and deep-link routing from
 * URL hashes. Handles two cases:
 *  1. Section hashes (e.g. #comments, #references) — opens the section and scrolls to it.
 *  2. Comment ID hashes (e.g. #comment-42) — classifies as page-level or inline,
 *     then either opens the comments section or sets `deepLinkCommentId` for the
 *     inline threads sidebar.
 */
export function usePublicationHashNavigation(comments: Comment[]) {
  const location = useLocation();

  const [isReferencesOpen, setIsReferencesOpen] = useState(false);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [isFeedbackFormOpen, setIsFeedbackFormOpen] = useState(true);
  const [isSocialOpen, setIsSocialOpen] = useState(false);

  const [deepLinkCommentId, setDeepLinkCommentId] = useState<
    number | undefined
  >();

  useEffect(() => {
    const hash = location.hash.replace("#", "");

    if (hash === "comments") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: hydration from URL hash
      setIsCommentsOpen(true);
      return;
    }

    const commentMatch = COMMENT_ID_HASH_REGEX.exec(hash);
    if (!commentMatch || comments.length === 0) return;

    const targetId = Number(commentMatch[1]);
    const target = classifyLinkedComment(targetId, comments);

    if (!target) {
      setIsCommentsOpen(true);
      return;
    }

    let scrollHandle: ReturnType<typeof scrollToCommentByIdWithRetry> | null =
      null;

    switch (target.kind) {
      case "page-level-root":
      case "page-level-reply":
        setIsCommentsOpen(true);
        scrollHandle = scrollToCommentByIdWithRetry(targetId);
        break;

      case "inline-root":
      case "inline-reply":
        setDeepLinkCommentId(targetId);
        break;
    }

    return () => scrollHandle?.cancel();
    // Re-run on hash change too, so switching the publication version from a
    // comment's version badge (which appends `#comment-<id>`) scrolls back to
    // that comment rather than leaving the reader at the top of the new version.
  }, [comments, location.hash]);

  // Workaround: the browser doesn't scroll to the hash target on initial load
  // because collapsible sections haven't expanded yet. We open the matching
  // section and then scroll after a brief delay.
  useEffect(() => {
    const hash = location.hash.replace("#", "");
    if (!hash) return;

    if (COMMENT_ID_HASH_REGEX.test(hash)) return;

    const sectionOpeners: Record<string, () => void> = {
      references: () => setIsReferencesOpen(true),
      "feedback-form": () => setIsFeedbackFormOpen(true),
      comments: () => setIsCommentsOpen(true),
      social: () => setIsSocialOpen(true)
    };

    const openSection = sectionOpeners[hash];

    if (openSection) {
      openSection();
      requestAnimationFrame(() => {
        setTimeout(() => {
          const element = document.getElementById(hash);
          if (element) {
            element.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        }, 500);
      });
    }
  }, [location.hash]);

  useScrollToAnchorLink();

  const handleDeepLinkConsumed = useCallback(() => {
    setDeepLinkCommentId(undefined);
  }, []);

  return {
    isReferencesOpen,
    setIsReferencesOpen,
    isCommentsOpen,
    setIsCommentsOpen,
    isFeedbackFormOpen,
    setIsFeedbackFormOpen,
    isSocialOpen,
    setIsSocialOpen,
    deepLinkCommentId,
    handleDeepLinkConsumed
  };
}
