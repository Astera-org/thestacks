import { type Footnotes, NO_FOOTNOTES } from "@/lib/mystmd/footnotes";
import type { MediaAsset } from "@/types";
import { createContext, useContext } from "react";

export interface MystmdContextValue {
  /** The publication's media assets, by public URL. */
  mediaAssetByUrl: ReadonlyMap<string, MediaAsset>;
  /** Reference text by lowercased URL, from the publication's `references`. */
  referenceTextByUrl: ReadonlyMap<string, string>;
  /** Drafts show notes, such as unknown directives, that readers do not see. */
  isDraft: boolean;
  /** KaTeX `macros`: the expansion of each LaTeX macro the document defines. */
  mathMacros: Readonly<Record<string, string>>;
  /** The document's footnotes, for the markers' popovers and the list. */
  footnotes: Footnotes;
}

const MystmdContext = createContext<MystmdContextValue>({
  footnotes: NO_FOOTNOTES,
  isDraft: false,
  mathMacros: {},
  mediaAssetByUrl: new Map(),
  referenceTextByUrl: new Map()
});

export const MystmdProvider = MystmdContext.Provider;

export function useMystmdContext(): MystmdContextValue {
  return useContext(MystmdContext);
}
