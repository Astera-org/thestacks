import { OrganizationV1, OrgOnPubV1 } from "@/types/v1";

/**
 * Converts an Organization object to an OrgOnPub object.
 * This is useful for when you need to add an organization to a publication.
 * @param {OrganizationV1} org
 * @returns {OrgOnPubV1}
 */
export function organizationToOrgOnPub(
  org: OrganizationV1,
  priority?: number
): OrgOnPubV1 {
  return {
    orgId: org.id,
    slug: org.slug,
    name: org.name,
    avatar: org.avatar,
    priority
  };
}
