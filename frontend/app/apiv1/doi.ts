import { http } from "@/apiv1/client";
import { DoiAttributes } from "@/types/datacite";

export type MintDoiResponse = {
  publicationId: number;
  slug: string;
  versionNumber: number;
  doi: string;
  versionDoi: string;
};
export async function mintDoi(idStr: string): Promise<MintDoiResponse> {
  const res = await http.post<MintDoiResponse>(`/publications/id/${idStr}/doi`);
  return res.data;
}

export async function saveSelfManagedDoi(
  idStr: string,
  doi: string
): Promise<void> {
  const res = await http.put<void>(`/publications/id/${idStr}/doi`, {
    doi
  });
  return res.data;
}

export async function getDoi(idStr: string): Promise<DoiAttributes | null> {
  const res = await http.get<DoiAttributes | null>(
    `/publications/id/${idStr}/doi`
  );
  return res.data;
}

export type DoiEligibility = { minting: boolean; selfMinting?: boolean };
export async function getDraftDoiEligibility(
  publicationId: string
): Promise<DoiEligibility> {
  const res = await http.get<DoiEligibility>(
    `/publications/id/${publicationId}/doi/eligibility`
  );
  return res.data;
}
