import { http } from "@/api/client";
import { Contributor, ContributorAffiliation } from "@/types";

export async function addContributor(payload: {
  slug: string;
  username: string;
  role: string;
  in_byline: boolean;
}): Promise<Contributor> {
  const res = await http.post<Contributor>(
    "/publications/add_contrib",
    payload
  );
  return res.data;
}

export async function removeContributor(payload: {
  slug: string;
  user_id: number;
  role: string;
}): Promise<void> {
  await http.post("/publications/remove_contrib", payload);
}

export async function addContribAffiliation(
  slug: string,
  payload: {
    user_id: number;
    org_slug: string;
  }
): Promise<ContributorAffiliation> {
  const res = await http.post<ContributorAffiliation>(
    `/publications/${slug}/contrib-affiliation`,
    payload
  );
  return res.data;
}

export async function removeContribAffiliation(
  slug: string,
  params: {
    user_id: number;
    org_slug: string;
  }
): Promise<void> {
  await http.delete(
    `/publications/${slug}/contrib-affiliation?user_id=${params.user_id}&org_slug=${params.org_slug}`
  );
}
