import type { Heading } from "@/types";
import { useEffect, useRef, useState } from "react";

/** Container element whose subtree holds the heading elements. */
const PUBLICATION_BODY_ID = "publication-body";

/**
 * Resolve heading DOM elements by their IDs.
 * Returns the elements in document order (same order as `headings`).
 */
function resolveHeadingElements(headings: Heading[]): HTMLElement[] {
  return headings
    .map((h) => document.getElementById(h.id))
    .filter((el): el is HTMLElement => el !== null);
}

/**
 * Hook to track which heading is currently active based on scroll position.
 *
 * Uses an IntersectionObserver to detect which heading is inside the
 * observation band (top 20%–40% of the viewport).
 *
 * Because React 19 may replace the heading DOM nodes after this effect first
 * runs (e.g. during hydration-mismatch recovery for `dangerouslySetInnerHTML`
 * content), a MutationObserver watches the publication body for subtree
 * changes and reconnects the IntersectionObserver to the current DOM nodes
 * whenever they are replaced.
 */
export function useActiveHeading(headings: Heading[]): string | null {
  const [activeId, setActiveId] = useState<string | null>(null);

  /** Keeps a reference to the currently-observed DOM elements so the
   *  MutationObserver callback can compare by identity. */
  const observedElementsRef = useRef<HTMLElement[]>([]);

  useEffect(() => {
    if (headings.length === 0) return;

    // ---- IntersectionObserver factory ----

    /** Headings currently inside the observation band, keyed by id. */
    const visibleHeadings = new Map<string, number>();

    const ioOptions: IntersectionObserverInit = {
      // Observation band: from 20% below the viewport top to 40% below it.
      rootMargin: "-20% 0px -60% 0px",
      threshold: [0, 0.25, 0.5, 0.75, 1]
    };

    let io: IntersectionObserver | null = null;

    /** Create (or recreate) the IntersectionObserver and observe `elements`. */
    function connectIO(elements: HTMLElement[]) {
      // Tear down any previous observer.
      if (io) {
        io.disconnect();
      }
      visibleHeadings.clear();

      try {
        io = new IntersectionObserver((entries) => {
          entries.forEach((entry) => {
            const id = entry.target.id;
            if (entry.isIntersecting) {
              visibleHeadings.set(id, entry.intersectionRatio);
            } else {
              visibleHeadings.delete(id);
            }
          });

          if (visibleHeadings.size === 0) {
            // No headings in the band — keep the last heading active when
            // the user has scrolled to the bottom of the page.
            const scrolledToBottom =
              window.innerHeight + window.scrollY >=
              document.documentElement.scrollHeight - 100;
            if (scrolledToBottom && headings.length > 0) {
              setActiveId(headings[headings.length - 1].id);
            }
            return;
          }

          // Activate the first visible heading in document order.
          const firstVisibleId = headings.find((h) =>
            visibleHeadings.has(h.id)
          )?.id;
          if (firstVisibleId) {
            setActiveId(firstVisibleId);
          }
        }, ioOptions);
      } catch {
        return;
      }

      elements.forEach((el) => io!.observe(el));
      observedElementsRef.current = elements;
    }

    // Initial connection. The headings may not be in the DOM yet (e.g. while
    // the lazy MyST renderer suspends); the MutationObserver connects then.
    const initialElements = resolveHeadingElements(headings);
    if (initialElements.length > 0) connectIO(initialElements);

    // ---- MutationObserver: detect heading element replacement ----
    //
    // React 19's hydration-mismatch recovery (and any future innerHTML
    // replacement by MystRenderer) destroys the heading DOM nodes the
    // IntersectionObserver was watching, and a lazily rendered body adds
    // them only after this effect runs.  A MutationObserver on the
    // publication body detects this and connects the IO to the live nodes.

    const bodyEl = document.getElementById(PUBLICATION_BODY_ID);
    let mo: MutationObserver | null = null;

    if (bodyEl) {
      mo = new MutationObserver(() => {
        const currentElements = resolveHeadingElements(headings);
        const prev = observedElementsRef.current;

        // Only reconnect if the actual DOM node references changed.
        const changed =
          currentElements.length !== prev.length ||
          currentElements.some((el, i) => el !== prev[i]);

        if (changed && currentElements.length > 0) {
          connectIO(currentElements);
        }
      });

      // Watch for child-list changes (innerHTML replacement adds/removes
      // children) anywhere inside the publication body.
      mo.observe(bodyEl, { childList: true, subtree: true });
    }

    return () => {
      io?.disconnect();
      mo?.disconnect();
      observedElementsRef.current = [];
    };
  }, [headings]);

  return activeId;
}
