import { createContext, useContext, type RefObject } from "react";

/**
 * Scoped state shared between the publication hero and the sticky title
 * banner. Extend with additional shared layout state as needed.
 */
export interface PublicationLayoutValue {
  isHeroInView: boolean;
  heroRef: RefObject<HTMLDivElement | null>;
}

export const PublicationLayoutContext =
  createContext<PublicationLayoutValue | null>(null);

export function usePublicationLayout(): PublicationLayoutValue {
  const ctx = useContext(PublicationLayoutContext);
  if (!ctx) {
    throw new Error(
      "usePublicationLayout must be used within a PublicationLayoutProvider"
    );
  }
  return ctx;
}
