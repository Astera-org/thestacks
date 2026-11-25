import { useBreakpoint } from "@/hooks/useBreakpoint";
import { useInlineCommentSelection } from "@/hooks/useInlineCommentSelection";
import type { Comment, User } from "@/types";
import { useCallback, useState } from "react";

/**
 * Orchestrates the inline commenting flow: text selection → bubble menu →
 * auth gate (if logged out) → new comment sheet → thread sheet on success.
 *
 * State machine:
 *  1. User highlights text → `selectionRect` populated, bubble menu appears.
 *  2. Bubble menu click → selection captured into `pendingSelectionData`.
 *     - Authenticated: opens NewInlineCommentSheet.
 *     - Unauthenticated: opens AuthModal, then sheet on success.
 *  3. Comment created → `createdInlineComment` set, switches to thread sheet.
 */
export function usePublicationInlineCommentFlow(user: User | null | undefined) {
  const isMd = useBreakpoint("md");
  const {
    selectionRect,
    selectionValidation,
    captureAndStoreSelection,
    resetCommentForm
  } = useInlineCommentSelection();

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showInlineCommentSheet, setShowInlineCommentSheet] = useState(false);
  const [pendingSelectionData, setPendingSelectionData] = useState<{
    anchor: string;
    pre: string;
    post: string;
    isCode: boolean;
    anchorHtml: string | null;
  } | null>(null);
  const [createdInlineComment, setCreatedInlineComment] =
    useState<Comment | null>(null);

  const handleBubbleMenuClick = useCallback(() => {
    const data = captureAndStoreSelection();
    if (!data) return;
    setPendingSelectionData(data);

    if (user) {
      setShowInlineCommentSheet(true);
    } else {
      setShowAuthModal(true);
    }
  }, [captureAndStoreSelection, user]);

  // After successful auth, resume the inline comment flow that was
  // interrupted by the auth modal.
  const handleAuthSuccess = useCallback(() => {
    setShowAuthModal(false);
    if (pendingSelectionData) {
      setShowInlineCommentSheet(true);
    }
  }, [pendingSelectionData]);

  const handleInlineCommentSuccess = useCallback((newComment: Comment) => {
    setCreatedInlineComment(newComment);
  }, []);

  const onNewInlineCommentSheetOpenChange = useCallback(
    (open: boolean) => {
      setShowInlineCommentSheet(open);
      if (!open) {
        setPendingSelectionData(null);
        resetCommentForm();
      }
    },
    [resetCommentForm]
  );

  const onInlineThreadsSheetOpenChange = useCallback(
    (open: boolean) => {
      setShowInlineCommentSheet(open);
      if (!open) {
        setPendingSelectionData(null);
        setCreatedInlineComment(null);
        resetCommentForm();
      }
    },
    [resetCommentForm]
  );

  const onInlineThreadCommentWithdrawn = useCallback(() => {
    setCreatedInlineComment(null);
    setShowInlineCommentSheet(false);
  }, []);

  return {
    isMobile: !isMd,
    selectionRect,
    selectionValidation,
    handleBubbleMenuClick,
    showAuthModal,
    setShowAuthModal,
    showInlineCommentSheet,
    pendingSelectionData,
    createdInlineComment,
    handleAuthSuccess,
    handleInlineCommentSuccess,
    onNewInlineCommentSheetOpenChange,
    onInlineThreadsSheetOpenChange,
    onInlineThreadCommentWithdrawn
  };
}
