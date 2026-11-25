import { revealTarget } from "@/lib/collapsibles";
import { useEffect } from "react";

const handleAnchorClick = (e: MouseEvent) => {
  const target = e.target as HTMLElement;
  const anchor = target.closest('a[href^="#"]');
  if (!anchor) return;

  const hash = anchor.getAttribute("href")?.slice(1);
  if (!hash) return;

  const element = document.getElementById(hash);
  if (element) {
    e.preventDefault();
    // Before scrolling: it opens any collapsed section the target is hidden in.
    void revealTarget(element);
    element.scrollIntoView({ behavior: "smooth", block: "start" });
    window.history.replaceState(null, "", `#${hash}`);
  }
};

/**
 * Hook to handle scrolling to an anchor link in the publication body.
 * This ensures that clicking the same anchor link twice still scrolls to the
 * target element, which doesn't happen by default since the browser only scrolls
 * when the hash actually changes.
 */
export function useScrollToAnchorLink() {
  useEffect(() => {
    const publicationBody = document.getElementById("publication-body");
    publicationBody?.addEventListener("click", handleAnchorClick);

    return () => {
      publicationBody?.removeEventListener("click", handleAnchorClick);
    };
  }, []);
}
