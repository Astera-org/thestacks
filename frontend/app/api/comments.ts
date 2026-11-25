import { http } from "@/api/client";
import { Comment, PaginatedComments } from "@/types";

interface CreateCommentPayload {
  body: string;
  parent_id?: number | null;
  anchor_text?: string | null;
  pre_text?: string | null;
  post_text?: string | null;
}

export async function listComments(
  publicationId: number,
  params?: { page?: number; per_page?: number }
): Promise<PaginatedComments> {
  const res = await http.get<PaginatedComments>(
    `/comments/publication/${publicationId}`,
    { params }
  );
  if (res.data == null || res.data.items == null) return res.data;
  // TODO: The backend does not actually include `publication_id`, so put it here.
  const items = res.data.items.map((comment) => ({
    ...comment,
    publication_id: publicationId
  }));
  res.data.items = items;
  return res.data;
}

export async function getComment(commentId: number): Promise<Comment> {
  const res = await http.get<Comment>(`/comments/${commentId}`);
  return res.data;
}

export async function createComment(
  publicationId: number,
  payload: CreateCommentPayload
): Promise<{ comment_id: number }> {
  const res = await http.post(
    `/comments/publication/${publicationId}`,
    payload
  );
  return res.data;
}

export async function updateComment(
  commentId: number,
  payload: { body: string }
): Promise<{ comment_id: number }> {
  const res = await http.patch(`/comments/${commentId}`, payload);
  return res.data;
}

export async function withdrawComment(commentId: number): Promise<void> {
  await http.patch(`/comments/${commentId}`, { state: "WITHDRAWN" });
}

// ============================================================================
// Image Upload
// ============================================================================

interface PresignedUrlResponse {
  upload_url: string;
  public_url: string;
}

/**
 * Request a presigned URL for uploading an image to S3.
 * The backend generates a unique filename and returns both the upload URL
 * (for PUT request) and the final public URL (for embedding in content).
 */
export async function getPresignedUploadUrl(
  slug: string,
  contentType: string,
  fileSize: number
): Promise<PresignedUrlResponse> {
  const res = await http.get<PresignedUrlResponse>("/comments/upload-url", {
    params: {
      slug,
      content_type: contentType,
      file_size: fileSize
    }
  });
  return res.data;
}

/**
 * Upload a file directly to S3 using a presigned URL.
 */
export async function uploadToS3(uploadUrl: string, file: File): Promise<void> {
  const response = await fetch(uploadUrl, {
    method: "PUT",
    body: file,
    headers: {
      "Content-Type": file.type
    }
  });

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
  }
}
