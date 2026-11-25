import Link from "@/components/Link";
import Avatar from "@/components/stacks-ui/Avatar";
import { cn } from "@/lib/utils";
import { sortedContributorsWithRoles } from "@/lib/utils/get-contributors-with-roles";
import { ContributorWithRoles, OrgOnPub } from "@/types";
import { useMemo } from "react";

interface ContributorsSectionProps {
  contributorsWithRoles: ContributorWithRoles[];
  className?: string;
  pubOrgs?: OrgOnPub[];
}

export default function ContributorsSection(props: ContributorsSectionProps) {
  const { contributorsWithRoles, className, pubOrgs = [] } = props;

  const sortedContributors = useMemo(
    () => sortedContributorsWithRoles(contributorsWithRoles),
    [contributorsWithRoles]
  );

  // Nothing to show — don't render the section at all.
  if (sortedContributors.length === 0) {
    return null;
  }

  // Gate: show affiliations if any contributor has explicit affiliations,
  // or if the publication itself has associated orgs.
  const shouldShowAffiliations =
    sortedContributors.some((c) => (c.affiliations?.length ?? 0) > 0) ||
    pubOrgs.length > 0;

  return (
    <div className={cn("bg-surface-sunken rounded-xl p-4 md:p-6", className)}>
      {/* Title. */}
      <div
        id="contributors"
        className="text-body-70 text-fg-strong scroll-mt-28 md:scroll-mt-36"
      >
        Contributors <span className="text-fg-subtle">(A-Z)</span>
      </div>

      {/* All contributors. */}
      <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2">
        {sortedContributors.map((contributor) => (
          <ContributorCard
            key={contributor.user_id}
            contributor={contributor}
            pubOrgs={pubOrgs}
            shouldShowAffiliations={shouldShowAffiliations}
          />
        ))}
      </div>
    </div>
  );
}

function ContributorCard({
  contributor,
  pubOrgs,
  shouldShowAffiliations
}: {
  contributor: ContributorWithRoles;
  pubOrgs: OrgOnPub[];
  shouldShowAffiliations: boolean;
}) {
  // If the contributor has explicit affiliations, show only those.
  // Otherwise fall back to pubOrgs. Deduped by name (not org_id, which can be
  // missing), sorted alphabetically.
  const source =
    (contributor.affiliations?.length ?? 0) > 0
      ? contributor.affiliations!
      : pubOrgs;
  const affiliations = shouldShowAffiliations
    ? Array.from(new Set(source.map((org) => org.name))).sort((a, b) =>
        a.localeCompare(b)
      )
    : [];

  return (
    <Link
      to={`/users/${contributor.user_id}`}
      className="bg-surface flex gap-4 rounded-xl p-4 transition-colors hover:bg-gray-200"
    >
      {/* User avatar. */}
      <Avatar
        src={contributor.avatar}
        alt={`${contributor.first_name} ${contributor.last_name}`}
        className="size-11 shrink-0"
      />

      {/* User name and roles. */}
      <div className="flex min-w-0 flex-col">
        <span className="text-body-30 text-fg-strong font-semibold">
          {contributor.first_name} {contributor.last_name}
        </span>

        {/* Affiliations. */}
        {affiliations.length > 0 && (
          <span className="text-muted-foreground mb-1 text-[12px] leading-3.5 md:text-[16px] md:leading-4">
            {affiliations.join(", ")}
          </span>
        )}

        <span className="text-fg-muted text-body-20">
          {contributor.roles.join(", ")}
        </span>
      </div>
    </Link>
  );
}
