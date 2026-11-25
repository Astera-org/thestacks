import { RequestError } from "@/api/errors";
import { http } from "@/apiv1/client";
import {
  MDAST_SCHEMA_VERSION,
  MYST_AST_VERSION,
  toRenderableVersion
} from "@/lib/mystmd/versions";

/**
 * Raven's MyST AST of a version (the contract is in the
 * `initial-myst-support` skill). Named here so the request says which
 * versions this renderer understands.
 */
export const MDAST_ACCEPT = `application/vnd.thestacks.mdast+json; schema=${MDAST_SCHEMA_VERSION}; version=${MYST_AST_VERSION}`;

/** A MyST AST node; `app/components/mystmd` reads it with myst-spec types. */
export interface MdastNode {
  type: string;
  children?: MdastNode[];
  [key: string]: unknown;
}

export interface MdastMessage {
  severity: "error" | "warning";
  message: string;
  part?: "abstract" | "body";
  line?: number;
}

export interface PublicationMdast {
  schema: number;
  version: number;
  /** A root with two blocks, `data.part` `"abstract"` and `"body"`. */
  tree: MdastNode;
  /** Reference URLs in citation order; a `cite`'s enumerator is its index + 1. */
  citations: { order: string[] };
  /**
   * The frontmatter needed to render the tree: `math`, the document's LaTeX
   * macros by name (`\R`). Absent when there is none.
   */
  frontmatter?: { math?: Record<string, { macro: string }> };
  /** Drafts only. */
  messages?: MdastMessage[];
}

/**
 * Returns `null` when Raven will not serve the AST (406: not MyST, or
 * switched off; 422: too large or failed to build) or sends a schema we do
 * not know, so the caller falls back to the existing renderer.
 */
async function fetchMdast(path: string): Promise<PublicationMdast | null> {
  try {
    const { data } = await http.get<PublicationMdast>(path, {
      headers: { Accept: MDAST_ACCEPT }
    });
    if (data.schema !== MDAST_SCHEMA_VERSION) {
      console.warn(
        `MyST AST schema ${data.schema} is not ${MDAST_SCHEMA_VERSION}; using the older renderer.`
      );
      return null;
    }
    return await toRenderableVersion(data);
  } catch (error) {
    const status =
      error instanceof RequestError ? error.cause.response?.status : undefined;
    if (status === 406 || status === 422) return null;
    throw error;
  }
}

export function getPublicationMdast(
  slug: string,
  versionNumber: number
): Promise<PublicationMdast | null> {
  return fetchMdast(
    `/publications/p/${encodeURIComponent(slug)}/versions/v${versionNumber}`
  );
}

export function getDraftMdast(
  publicationUlid: string
): Promise<PublicationMdast | null> {
  return fetchMdast(
    `/publications/id/${encodeURIComponent(publicationUlid)}/draft`
  );
}
