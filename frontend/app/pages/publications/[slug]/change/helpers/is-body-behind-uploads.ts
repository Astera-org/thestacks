import { ImportStatusResponse } from "@/apiv1/imports";

/**
 * Whether `body` is older than the server's copy: the import has settled,
 * yet the body still has the ref of an upload that finished, which the server
 * has already swapped for its URL. That happens when the body was fetched
 * while the media was still uploading.
 */
export function isBodyBehindUploads(
  body: string | null | undefined,
  uploadState: ImportStatusResponse | undefined
): boolean {
  if (!body || !uploadState?.settled) return false;
  return uploadState.uploads.some(
    ({ ref, status }) => status === "completed" && body.includes(ref)
  );
}
