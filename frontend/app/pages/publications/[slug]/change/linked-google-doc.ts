import type { ImportDocumentV1 } from "@/types/v1";

/** An import that is a Google Doc, so it always has a URL. */
export type LinkedGoogleDoc = ImportDocumentV1 & { url: string };

/**
 * The Google Doc a draft is linked to, if any. Drafts from other sources
 * also have an `importDocument` (a MyST document has no URL), but only a
 * Google Doc can be re-synced or switched.
 */
export function linkedGoogleDoc(
  importDocument: ImportDocumentV1 | null | undefined
): LinkedGoogleDoc | null {
  if (importDocument?.format !== "gdoc" || !importDocument.url) return null;
  return { ...importDocument, url: importDocument.url };
}
