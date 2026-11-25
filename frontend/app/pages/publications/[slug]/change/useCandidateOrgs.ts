import { getCandidateOrgs } from "@/apiv1/publications";
import { EditPublicationStatus } from "@/hooks/use-edit-publication/types";
import { OrganizationV1, PaginatedResponseV1, PublicationV1 } from "@/types/v1";
import { useQuery } from "@tanstack/react-query";

/**
 * Orgs the publication's owner or any of its contributors belong to. Shared
 * by the organizations picker and the contributor affiliation picker, so both
 * read one cached request.
 */
export function useCandidateOrgs(
  publication: PublicationV1 | undefined,
  status: EditPublicationStatus
) {
  return useQuery<PaginatedResponseV1<OrganizationV1> | undefined>({
    queryKey: [
      "potentialOrgs",
      publication?.id,
      publication?.contributors.map((c) => c.userId).join(","),
    ],
    queryFn: () =>
      publication
        ? getCandidateOrgs(publication.id)
        : Promise.resolve(undefined),
    enabled: !!publication?.id && !["saving", "init"].includes(status.status),
  });
}
