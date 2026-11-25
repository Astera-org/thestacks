import { parseCommentIdFromHash } from "@/lib/commentNavigation";
import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router";

/** Comment id the URL points at (`#comment-<id>`), or null for any other hash. */
export function useLinkedCommentId(): number | null {
  const { hash } = useLocation();
  return parseCommentIdFromHash(hash);
}

/**
 * Flags the deep-linked comment once it scrolls into view. Arrival matters: the
 * card mounts inside a collapsed section thousands of pixels below the fold, so
 * a flash started at mount would be over before the smooth scroll gets there.
 */
export function useLinkedCommentFlash(commentId: number) {
  const isLinked = useLinkedCommentId() === commentId;

  const ref = useRef<HTMLDivElement>(null);
  const [arrived, setArrived] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!isLinked || !el) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      setArrived(true);
      observer.disconnect();
    });
    observer.observe(el);

    return () => {
      observer.disconnect();
      setArrived(false);
    };
  }, [isLinked]);

  // `isLinked` guards the render between a hash change and the reset above.
  return { ref, isLinked, flash: isLinked && arrived };
}
