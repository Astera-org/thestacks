import { redirect } from "react-router";
import type { Route } from "./+types/redirect-to-edit";

/**
 * The editor moved from `/publications/:pubId/change` to
 * `/publications/:pubId/edit`. Raven's v1 API still returns `/change` links for
 * drafts (`draft-links.ts`), so keep those and old bookmarks working.
 */
export function loader({ params, request }: Route.LoaderArgs) {
  const { search } = new URL(request.url);
  throw redirect(
    `/publications/${encodeURIComponent(params.pubId)}/edit${search}`,
    302
  );
}
