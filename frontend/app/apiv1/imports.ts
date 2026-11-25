import { http } from "@/apiv1/client";
import { ValidationIssue } from "../api/errors";

/** Where the document comes from. More source types will be added. */
export type ImportSource = { type: "url"; url: string };

/**
 * What kind of document it is. Omit it (or send `auto`) to let the backend
 * detect the format from the source. More formats will be added.
 */
export type ImportFormat = { type: "auto" } | { type: "gdoc" };

/**
 * Where the document goes: a new draft (the default), or an existing
 * publication's draft, replacing its title, subtitle, abstract and body.
 */
export type ImportTarget =
  { type: "new" } | { type: "draft"; publicationId: string };

export type CreateImportRequest = {
  source: ImportSource;
  format?: ImportFormat;
  target?: ImportTarget;
};

export type CreateImportResponse = {
  publicationId: string;
  versionId: string;
  importId: string;
  slug: string;
  /** False while the import's media is still being copied. */
  settled: boolean;
  validationErrors: ValidationIssue[];
};

export async function createImport(
  payload: CreateImportRequest
): Promise<CreateImportResponse> {
  const res = await http.post<CreateImportResponse>("/imports", payload);
  return res.data;
}

export type ImportError = {
  code:
    | "unavailable"
    | "unsupported"
    | "unreadable"
    | "retries-exhausted"
    | "failed";
  message: string;
};

/** Where an import's media came from: a link in the doc, or a file in it. */
export type ImportUploadSource =
  | { type: "url"; url: string }
  | { type: "bytes"; filename: string; mimeType?: string };

/** One media file an import is copying into Raven's storage. */
export type ImportUpload = {
  id: string;
  /** The `raven-media://` placeholder for it in the imported body. */
  ref: string;
  status: "pending" | "active" | "completed" | "failed";
  url: string | null;
  error: null | ImportError;
  /** Not sent by backends from before upload sources were added. */
  source?: ImportUploadSource;
};

export type ImportStatusResponse = {
  publicationId: string;
  versionId: string;
  settled: boolean;
  uploads: ImportUpload[];
};

export async function getImport(
  importId: string
): Promise<ImportStatusResponse> {
  const res = await http.get<ImportStatusResponse>(`/imports/${importId}`);
  return res.data;
}
