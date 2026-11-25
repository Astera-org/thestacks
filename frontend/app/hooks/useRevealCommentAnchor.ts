import { revealCommentAnchor } from "@/lib/comments/revealCommentAnchor";
import { useCallback, useEffect, useRef } from "react";

/**
 * The reveal in progress, from any component. The page can scroll to only one
 * comment, so starting a reveal cancels whichever one is still waiting, even
 * if another component (a comment card, the sheet, a deep link) started it.
 */
let pending: AbortController | null = null;

/**
 * `revealCommentAnchor`, cancelled when any reveal starts after it, or when
 * the component that started it unmounts, so a reveal still waiting for its
 * anchor doesn't scroll the page after the reader has moved on.
 */
export function useRevealCommentAnchor() {
  const mine = useRef<AbortController | null>(null);

  // Not tied to the effect that starts a reveal: the deep-link effect re-runs
  // as soon as it clears its trigger, and would abort its own reveal
  useEffect(
    () => () => {
      if (mine.current && pending === mine.current) {
        pending.abort();
        pending = null;
      }
    },
    []
  );

  return useCallback(async (commentId: number) => {
    pending?.abort();
    const controller = new AbortController();
    pending = controller;
    mine.current = controller;
    try {
      return await revealCommentAnchor(commentId, controller.signal);
    } finally {
      if (pending === controller) pending = null;
    }
  }, []);
}
