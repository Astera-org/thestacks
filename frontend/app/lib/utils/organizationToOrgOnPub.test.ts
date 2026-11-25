import { OrganizationV1 } from "@/types/v1";
import { describe, expect, it } from "vitest";
import { organizationToOrgOnPub } from "./organizationToOrgOnPub";

function makeOrganization(
  overrides: Partial<OrganizationV1> = {}
): OrganizationV1 {
  return {
    id: "01M32GKQBPN0XP1P5F8WK1V712",
    slug: "arcadia-science",
    name: "Arcadia Science",
    avatar: "https://example.com/avatar.png",
    rorId: null,
    createdAt: "2024-01-01T00:00:00.000Z",
    ...overrides
  };
}

describe("organizationToOrgOnPub", () => {
  it("maps id to org_id and passes slug/name/avatar through", () => {
    const org = makeOrganization();
    expect(organizationToOrgOnPub(org)).toEqual({
      orgId: org.id,
      slug: org.slug,
      name: org.name,
      avatar: org.avatar,
      priority: undefined
    });
  });

  it("passes priority through when given", () => {
    expect(organizationToOrgOnPub(makeOrganization(), 2)).toMatchObject({
      priority: 2
    });
  });

  it("leaves priority undefined when omitted", () => {
    expect(organizationToOrgOnPub(makeOrganization()).priority).toBeUndefined();
  });

  it("carries a null avatar through unchanged", () => {
    const org = makeOrganization({ avatar: null });
    expect(organizationToOrgOnPub(org).avatar).toBeNull();
  });
});
