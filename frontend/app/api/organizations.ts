import { http } from "@/api/client";
import { Organization, PaginatedPublications } from "@/types";

export async function getOrganization(slug: string): Promise<Organization> {
  const res = await http.get<Organization>(`/orgs/${slug}`);
  return res.data;
}

export async function getOrgPublications(
  slug: string,
  params?: { page?: number; per_page?: number }
): Promise<PaginatedPublications> {
  const res = await http.get<PaginatedPublications>(
    `/orgs/${slug}/publications`,
    {
      params
    }
  );
  return res.data;
}
