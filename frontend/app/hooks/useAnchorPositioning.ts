import {
  buildThreads,
  findAnchorElement,
  findBubbleTarget,
  groupThreadsByLine,
  ParagraphGroup,
  PositionedCommentThread
} from "@/lib/comments/commentThreadData";
import {
  injectAnchorsIntoDom,
  setupImageObserver,
  unwrapAnchors
} from "@/lib/comments/inlineCommentAnchors";
import { LEGEND_CONTENT_CHANGED_EVENT } from "@/lib/truncatedLegends";
import { Comment } from "@/types";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState
} from "react";

interface AnchorPositioningResult {
  paragraphGroups: ParagraphGroup[];
  tops: Record<number, number>;
  anchorVersion: number;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

/**
 * Observe `#publication-body` and inject the inline-comment anchors again when its children change,
 * so comments that load before the body (placeholder or lazy renderer) still anchor.
 */
export function useAnchorPositioning(
  comments: Comment[],
  pathname: string,
  isMobile: boolean
): AnchorPositioningResult {
  const [anchorVersion, setAnchorVersion] = useState(0);
  useEffect(() => {
    const handler = () => setAnchorVersion((v) => v + 1);
    window.addEventListener("stacks-anchors-updated", handler);
    return () => window.removeEventListener("stacks-anchors-updated", handler);
  }, []);

  useLayoutEffect(() => {
    const bodyEl = document.getElementById("publication-body");
    if (!bodyEl) return;

    // The body may still be a placeholder (a MyST draft's AST or the lazy
    // renderer is loading), or React may replace it later (hydration-mismatch
    // recovery), so inject again whenever its own children change. Changes
    // deeper down (a tab switch, a copy button) are left alone: re-injecting
    // on those would shift anchors. The exception is a figure legend expanding
    // or collapsing, which adds or removes text that comments can anchor in.
    // Injection unwraps existing anchors first, and its own mutations are not
    // observed.
    let frame: number | null = null;
    const scheduleInject = () => {
      if (frame != null) return;
      frame = requestAnimationFrame(() => {
        frame = null;
        inject();
      });
    };
    const observer = new MutationObserver(scheduleInject);
    const inject = () => {
      observer.disconnect();
      injectAnchorsIntoDom(bodyEl, comments);
      observer.observe(bodyEl, { childList: true });
    };
    inject();
    window.addEventListener(LEGEND_CONTENT_CHANGED_EVENT, scheduleInject);

    return () => {
      observer.disconnect();
      window.removeEventListener(LEGEND_CONTENT_CHANGED_EVENT, scheduleInject);
      if (frame != null) cancelAnimationFrame(frame);
      unwrapAnchors(bodyEl);
    };
  }, [comments, pathname]);

  const allThreads = useMemo(() => buildThreads(comments), [comments]);

  const threads: PositionedCommentThread[] = useMemo(() => {
    const located = allThreads.filter(
      ({ root }) => findAnchorElement(root.comment_id) != null
    );
    const withPos = located.map((t) => {
      const el = findBubbleTarget(findAnchorElement(t.root.comment_id)!);
      return {
        thread: t,
        y: el.getBoundingClientRect().top + window.scrollY
      };
    });
    withPos.sort((a, b) => a.y - b.y);
    return withPos;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allThreads, anchorVersion]);

  const paragraphGroups = useMemo(() => {
    return groupThreadsByLine(threads);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threads, anchorVersion]);

  const [tops, setTops] = useState<Record<number, number>>({});
  const containerRef = useRef<HTMLDivElement | null>(null);

  const computeTops = useCallback(() => {
    if (!containerRef.current) return;

    const publicationBody = document.getElementById("publication-body");
    const publicationBodyTop = publicationBody
      ? publicationBody.getBoundingClientRect().top + window.scrollY
      : 0;

    const positions: Record<number, number> = {};
    paragraphGroups.forEach(({ paragraph, threads: groupThreads }) => {
      if (groupThreads.length === 0) return;
      const key = groupThreads[0].root.comment_id;

      const anchorEl = findAnchorElement(key);
      const refEl = anchorEl ? findBubbleTarget(anchorEl) : paragraph;

      const y = isMobile
        ? refEl.getBoundingClientRect().top + window.scrollY
        : refEl.getBoundingClientRect().top +
          window.scrollY -
          publicationBodyTop;
      positions[key] = y;
    });
    setTops(positions);
  }, [paragraphGroups, isMobile]);

  useEffect(() => {
    let unmounted = false;
    computeTops();
    setupImageObserver(() => {
      if (!unmounted) computeTops();
    });
    window.addEventListener("resize", computeTops, { passive: true });
    return () => {
      unmounted = true;
      window.removeEventListener("resize", computeTops);
    };
  }, [computeTops, anchorVersion]);

  return { paragraphGroups, tops, anchorVersion, containerRef };
}
