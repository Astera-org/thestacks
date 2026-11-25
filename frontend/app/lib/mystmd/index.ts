import type { Publication } from "@/types";

/**
 * Whether a publication is rendered from Raven's MyST AST rather than by the
 * existing renderer, which only understands the Google Docs dialect.
 */
export function isMystPublication(
  publication: Pick<Publication, "content"> | null | undefined
): boolean {
  return publication?.content?.format === "myst";
}
