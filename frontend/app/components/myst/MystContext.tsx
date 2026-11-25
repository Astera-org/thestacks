import { createContext, useContext } from "react";

export interface MystContextValue {
  /** Called when the "Expand" action button is clicked on a figure. */
  onExpandFigure: (figureEl: HTMLElement) => Promise<void>;
  /** Called when the "Download" action button is clicked on a figure or audio element. */
  onDownloadMedia: (targetEl: HTMLElement) => Promise<void>;
  publicationSlug?: string;
}

const MystContext = createContext<MystContextValue | null>(null);

export const MystProvider = MystContext.Provider;

export function useMystContext(): MystContextValue | null {
  return useContext(MystContext);
}
