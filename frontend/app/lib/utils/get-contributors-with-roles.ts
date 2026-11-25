import type { Contributor, ContributorWithRoles } from "@/types";

// Accept both the v1 shape (`roles: string[]`) and the v0 shape, which has one
// row per contributor-role pair with a single `role`.
function rolesOf(contributor: Contributor): string[] {
  if (contributor.roles) return contributor.roles;
  return contributor.role ? [contributor.role] : [];
}

// Match SQL MIN: a missing priority never wins over a real one, and two
// missing priorities stay missing so the A-Z tiebreak still applies.
function minPriority(a: number | null, b: number | null): number | null {
  if (a == null) return b;
  if (b == null) return a;
  return Math.min(a, b);
}

export function getContributorsWithRoles(
  pubContribs: Contributor[]
): ContributorWithRoles[] {
  const contributors: ContributorWithRoles[] = [];

  for (const contributor of pubContribs ?? []) {
    const existingContributor = contributors.find(
      (c) => c.user_id === contributor.user_id
    );
    if (existingContributor) {
      existingContributor.roles.push(...rolesOf(contributor));

      // Ensure the priority is the least
      existingContributor.priority = minPriority(
        existingContributor.priority,
        contributor.priority
      );

      // Ensure the byline boolean is right
      existingContributor.in_byline ||= contributor.in_byline;

      // Ensure affiliations are all migrated
      existingContributor.affiliations = Array.from(
        // Make them unique by ID
        new Map(
          [
            ...existingContributor.affiliations,
            ...(contributor.affiliations ?? [])
          ].map((affiliation) => [affiliation.org_id, affiliation] as const)
        ).values()
      );
    } else {
      contributors.push({
        ...contributor,
        roles: [...rolesOf(contributor)],
        affiliations: contributor.affiliations ?? []
      });
    }
  }

  return contributors;
}

export function sortedContributorsWithRoles(
  contributorsWithRoles: ContributorWithRoles[]
) {
  return contributorsWithRoles.slice().sort((a, b) => {
    const aPriority = a.priority ?? 99999999;
    const bPriority = b.priority ?? 99999999;
    if (aPriority !== bPriority) return aPriority - bPriority;
    return (a.last_name ?? "").localeCompare(b.last_name ?? "");
  });
}
