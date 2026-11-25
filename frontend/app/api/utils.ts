import { API_BASE_URL } from "@/api/client";

/**
 * Turn any asset path returned by the API into an absolute URL so that the
 * browser does not treat it as relative to the current route (e.g. /publications/…)
 * which would lead to broken requests such as "…/publications/api/files/…".
 */
export function assetUrl(path: string | null | undefined): string | null {
  path = path?.trim();
  if (!path) return null;
  if (path === "") return null;
  if (
    path.startsWith("http://") ||
    path.startsWith("https://") ||
    path.startsWith("data:")
  ) {
    return path;
  }

  // For avatar paths, prepend api/files/ if not already present
  if (path.startsWith("avatars/") && !path.startsWith("api/files/")) {
    return `${API_BASE_URL}/files/${path}`;
  }

  const normalised = path.startsWith("/") ? path : `/${path}`;

  return normalised; // same-origin "/…"
}
