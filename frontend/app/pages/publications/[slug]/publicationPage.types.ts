import type { PublicationMdast } from "@/apiv1/mdast";
import type { Publication } from "@/types";

export interface LoaderArgs {
  params: { slug: string; versionNumber?: string };
  request: Request;
}

/**
 * Server-side loader data for published publications. `null` for drafts,
 * which are fetched client-side because the backend requires a JWT from
 * local storage that isn't available during SSR.
 */
export interface LoaderData {
  publication: Publication;
  /**
   * The MyST AST of a MyST publication; `null` when it is not MyST or Raven
   * did not serve the AST, and the existing renderer is used instead.
   */
  mdast: PublicationMdast | null;
  title: string;
  subtitle: string;
  abstract: string;
  baseUrl: string;
  /** Parsed from the URL param (e.g. "v2" → 2). `null` for latest version. */
  versionNumber: number | null;
  slug: string;
}
