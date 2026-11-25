import { http } from "@/api/client";
import {
  LinkedAsset,
  Organization,
  PaginatedDrafts,
  PaginatedPublications,
  Publication,
  UserPermissionsOnPublication
} from "@/types";
import { ValidationIssue } from "./errors";

/**
 * The backend may return either `{ publication: publication }` or the publication object
 * directly. This helper normalises both shapes.
 */
function unwrapPublication(data: any): Publication {
  return data && typeof data === "object" && "publication" in data
    ? (data.publication as Publication)
    : (data as Publication);
}

export async function listPublications(params?: {
  page?: number;
  per_page?: number;
  q?: string;
  t?: string;
}): Promise<PaginatedPublications> {
  const res = await http.get<PaginatedPublications>("/publications", {
    params
  });
  return res.data;
}

export async function getPublication(
  slug: string,
  versionNumber?: number | null
): Promise<Publication> {
  let path = `/publications/${slug}`;
  if (versionNumber !== undefined && versionNumber !== null) {
    path += `/v${versionNumber}`;
  }
  const res = await http.get<{ publication: Publication }>(path);
  return res.data.publication;
}

export async function getUserPubPermissions(
  slug: string
): Promise<UserPermissionsOnPublication> {
  const path = `/publications/${slug}/user_perms`;
  const res = await http.get<UserPermissionsOnPublication>(path);
  return res.data;
}

export async function getDraft(
  slug: string
): Promise<{ publication: Publication; validationErrors: ValidationIssue[] }> {
  const res = await http.get<{
    publication: Publication;
    validationErrors: ValidationIssue[];
  }>(`/publications/${slug}/draft`);
  return res.data;
}

export async function getOrCreateDraft(slug: string): Promise<Publication> {
  const res = await http.post<{ publication: Publication }>(
    `/publications/${slug}/draft`,
    {}
  );
  return res.data.publication;
}

export async function createPublication(
  payload: Partial<Publication>
): Promise<{
  publication_id: number;
  publication_id_str: string;
  slug: string;
}> {
  const res = await http.post<{
    publication_id: number;
    publication_id_str: string;
    slug: string;
  }>("/publications", payload);
  return res.data;
}

export async function updatePublication(
  slug: string,
  payload: Partial<Publication>
): Promise<Publication> {
  const res = await http.put(`/publications/${slug}`, payload);
  return unwrapPublication(res.data);
}

export async function deleteDraft(slug: string): Promise<void> {
  await http.delete(`/publications/${slug}/draft`);
}

export async function publishPublication(
  slug: string,
  note?: string | null
): Promise<Publication> {
  const res = await http.post(`/publications/${slug}/publish`, { note });
  res.data.id = res.data.publication_id;
  return unwrapPublication(res.data);
}

export async function myDrafts(params?: {
  page?: number;
  per_page?: number;
}): Promise<PaginatedDrafts> {
  const res = await http.get<PaginatedDrafts>("/publications/my/drafts", {
    params
  });
  return res.data;
}

export async function updatePublicationTags(slug: string, tags: string[]) {
  const res = await http.post(`/publications/${slug}/tags`, { tags });
  return res.data;
}

export async function updateLinkedAssets(
  slug: string,
  linked_assets: LinkedAsset[]
) {
  const res = await http.post(`/publications/${slug}/linked-assets`, {
    linked_assets
  });
  return res.data;
}

/**
 * List organizations that can be attached to the given publication,
 * but are currently not linked.
 */
export async function getPotentialOrgs(slug: string): Promise<Organization[]> {
  const res = await http.get<Organization[]>("/publications/potential_orgs", {
    params: { slug }
  });
  return res.data;
}

export async function addOrgToPublication(payload: {
  slug: string;
  org_id: number;
}): Promise<void> {
  await http.post("/publications/add_org", payload);
}

export async function removeOrgFromPublication(payload: {
  slug: string;
  org_id: number;
}): Promise<void> {
  await http.post("/publications/remove_org", payload);
}
