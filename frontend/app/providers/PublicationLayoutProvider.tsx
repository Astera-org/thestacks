import { PublicationLayoutContext } from "@/hooks/usePublicationLayout";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

/**
 * Owns the IntersectionObserver that tracks whether the publication hero is
 * within the viewport. `isHeroInView` stays `true` as long as any part of the
 * hero overlaps the viewport, so dependents can hide the moment the hero
 * touches the screen.
 */
export function PublicationLayoutProvider({
  children
}: {
  children: ReactNode;
}) {
  const [isHeroInView, setIsHeroInView] = useState(true);
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(([entry]) =>
      setIsHeroInView(entry.isIntersecting)
    );
    observer.observe(el);

    return () => observer.disconnect();
  }, []);

  const value = useMemo(() => ({ isHeroInView, heroRef }), [isHeroInView]);

  return (
    <PublicationLayoutContext.Provider value={value}>
      {children}
    </PublicationLayoutContext.Provider>
  );
}
