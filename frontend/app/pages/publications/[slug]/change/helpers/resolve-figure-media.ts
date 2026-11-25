import { ImportUpload } from "@/apiv1/imports";
import { MediaAssetV1 } from "@/types/v1";

// Raven's MEDIA_REF_PREFIX: the importer's placeholder for media until it's
// copied into Raven's storage.
const MEDIA_REF_PREFIX = "raven-media://";

/**
 * What a media `src` in the body will show:
 * - `pending`, `uploading`, `ready`, `failed`: an import upload's progress.
 *   `ready` is also any file Raven already stores for the version.
 * - `unresolved`: a `raven-media://` ref the current import doesn't know.
 * - `embedded`: a `data:` URL.
 * - `external`: an http(s) URL Raven doesn't store, e.g. an embedded form.
 * - `missing`: no `src` at all.
 * - `invalid`: a `src` that isn't an http(s) URL, e.g. template text.
 */
export type FigureMediaStatus =
  | "pending"
  | "uploading"
  | "ready"
  | "failed"
  | "unresolved"
  | "embedded"
  | "external"
  | "missing"
  | "invalid";

export type ResolvedFigureMedia = {
  status: FigureMediaStatus;
  /** The current import's upload of this media, if it came from one. */
  upload: ImportUpload | null;
  /** The stored file, once there is one. */
  asset: MediaAssetV1 | null;
};

const UPLOAD_STATUSES: Record<ImportUpload["status"], FigureMediaStatus> = {
  pending: "pending",
  active: "uploading",
  completed: "ready",
  failed: "failed",
};

/**
 * Returns a function telling what each media `src` in a body will show, given
 * the current import's uploads and the version's stored files.
 */
export function createFigureMediaResolver({
  uploads,
  mediaAssets,
}: {
  uploads: readonly ImportUpload[];
  mediaAssets: readonly MediaAssetV1[];
}): (src: string | null) => ResolvedFigureMedia {
  const uploadsByRef = new Map(uploads.map((u) => [u.ref, u]));
  const uploadsByUrl = new Map(
    uploads.flatMap((u) => (u.url ? [[u.url, u] as const] : []))
  );
  const assetsByUrl = new Map(mediaAssets.map((a) => [a.publicUrl, a]));

  return (src) => {
    if (!src) return resolved("missing");

    if (src.startsWith(MEDIA_REF_PREFIX)) {
      const upload = uploadsByRef.get(src);
      if (!upload) return resolved("unresolved");
      const asset = upload.url ? assetsByUrl.get(upload.url) : undefined;
      return resolved(UPLOAD_STATUSES[upload.status], upload, asset);
    }

    const upload = uploadsByUrl.get(src);
    const asset = assetsByUrl.get(src);
    if (upload || asset) return resolved("ready", upload, asset);
    if (src.startsWith("data:")) return resolved("embedded");
    return resolved(isHttpUrl(src) ? "external" : "invalid");
  };
}

function resolved(
  status: FigureMediaStatus,
  upload?: ImportUpload,
  asset?: MediaAssetV1
): ResolvedFigureMedia {
  return { status, upload: upload ?? null, asset: asset ?? null };
}

function isHttpUrl(src: string): boolean {
  try {
    const { protocol } = new URL(src);
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}
