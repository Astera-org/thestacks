import { didMissHashTarget } from "@/hooks/useCommittedLocation";
import { revealTarget } from "@/lib/collapsibles";
import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router";

/**
 * Brings the location hash's target into view. Rendered after the body, so it
 * mounts only once the target can exist: the lazy MyST renderer or a draft's AST
 * may arrive after ScrollRestoration has already looked for it and given up.
 * When ScrollRestoration found the target, this leaves it alone, so a reload or
 * Back keeps the reader's position.
 */
export default function HashTarget() {
  const { hash, key } = useLocation();
  const [missedByScrollRestoration] = useState(() => didMissHashTarget(key));
  const hasMounted = useRef(false);

  useEffect(() => {
    const isMount = !hasMounted.current;
    hasMounted.current = true;

    const rawId = hash.slice(1);
    if (rawId === "") return;

    let id: string;
    try {
      id = decodeURIComponent(rawId);
    } catch {
      return;
    }

    const element = document.getElementById(id);
    if (!element) return;
    // Later hash changes are scrolled by the browser or ScrollRestoration.
    if (isMount && missedByScrollRestoration)
      element.scrollIntoView({ block: "start" });
    void revealTarget(element);
  }, [hash, missedByScrollRestoration]);

  return null;
}
