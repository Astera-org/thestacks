import { http } from "@/apiv1/client";
import { FieldName } from "@/hooks/use-edit-publication/fields";
import { FieldError } from "@/hooks/use-edit-publication/types";
import {
  OrganizationV1,
  PaginatedDraftsV1,
  PaginatedResponseV1,
  PublicationV1
} from "@/types/v1";
import { ValidationIssue } from "../api/errors";

export type DraftResponse = {
  publication: PublicationV1;
  // Omitted by the API when the draft is ready to publish.
  validationErrors?: ValidationIssue[];
};
export async function getDraftById(id: string): Promise<DraftResponse> {
  const response = await http.get<DraftResponse>(
    `/publications/id/${id}/draft`
  );
  return response.data;
}

export async function createPublication(
  payload: Partial<PublicationV1>
): Promise<{
  publicationId: string;
  slug: string;
}> {
  const res = await http.post<{
    publicationId: string;
    slug: string;
  }>("/publications", payload);
  return res.data;
}

/**
 * Code of the `validationErrors` warning sent when the requested slug was
 * taken and a free variant of it was stored instead. Informational only.
 */
export const SLUG_REPLACED_CODE = "slug_replaced";

export type PatchResponseV1 = {
  publication: PublicationV1;
  applied: FieldName[];
  rejected?: Partial<Record<FieldName, FieldError>>;
  validationErrors: ValidationIssue[];
};
export async function patchPublicationById(
  id: string,
  body: Record<string, unknown>
): Promise<PatchResponseV1> {
  const response = await http.patch<PatchResponseV1>(
    `/publications/id/${id}`,
    body
  );

  return response.data;
}

export async function deleteDraft(publicationId: string): Promise<void> {
  await http.delete(`/publications/id/${publicationId}/draft`);
}

export async function publishPublication(
  publicationId: string,
  note?: string | null
): Promise<PublicationV1> {
  const res = await http.post(`/publications/id/${publicationId}/publish`, {
    note
  });
  res.data.id = res.data.publicationId;
  return res.data;
}

// keep
export async function myDrafts(params?: {
  page?: number;
  perPage?: number;
}): Promise<PaginatedDraftsV1> {
  const res = await http.get<PaginatedDraftsV1>("/publications/drafts", {
    params
  });
  return res.data;
}

/**
 * List organizations that can be attached to the given publication,
 * but are currently not linked.
 */
export async function getCandidateOrgs(
  publicationId: string
): Promise<PaginatedResponseV1<OrganizationV1>> {
  const res = await http.get<PaginatedResponseV1<OrganizationV1>>(
    `/publications/id/${publicationId}/candidate-orgs`,
    {}
  );
  return res.data;
}

export type PostEditPublicationResponse = {
  publicationId: string;
  slug: string;
  versionId: string;
};
export async function postEditPublication(
  publicationId: string
): Promise<PostEditPublicationResponse> {
  const res = await http.post<PostEditPublicationResponse>(
    `/publications/p/${publicationId}/draft`
  );
  return res.data;
}
