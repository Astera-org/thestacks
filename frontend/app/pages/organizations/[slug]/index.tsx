import { getOrganization, getOrgPublications } from "@/api/organizations";
import { assetUrl } from "@/api/utils";
import { RORIcon } from "@/components/icons";
import ProfilePageHeader from "@/components/ProfilePageHeader";
import PublicationsSection from "@/components/PublicationsSection";
import ShareProfileButton from "@/components/ShareProfileButton";
import Chip from "@/components/stacks-ui/Chip";
import { Pagination } from "@/components/stacks-ui/Pagination";
import useAppNavigate from "@/hooks/useAppNavigate";
import { usePaginationTransition } from "@/hooks/usePaginationTransition";
import { formatDate } from "@/lib/utils";
import { Organization, PaginatedPublications } from "@/types";
import { useCallback } from "react";
import { redirect, useLocation, useSearchParams } from "react-router";

const NUM_PUBLICATIONS_PER_PAGE = 9;

export async function loader({
  params,
  request
}: {
  params: { slug: string };
  request: Request;
}) {
  const { slug } = params;
  const url = new URL(request.url);
  const pageParam = url.searchParams.get("page");
  const page = pageParam ? Math.max(1, parseInt(pageParam, 10) || 1) : 1;

  let organization: Organization;
  try {
    organization = await getOrganization(slug);
  } catch (error) {
    console.error(error);
    throw redirect("/not-found", { status: 404 });
  }

  // Show 404 for unlisted organizations.
  if (organization.unlisted) {
    throw redirect("/not-found", { status: 404 });
  }

  // Redirect numeric IDs (e.g. /organizations/2) to the canonical slug URL.
  if (organization.slug !== slug) {
    const query = url.search;
    throw redirect(`/organizations/${organization.slug}${query}`, 301);
  }

  const organizationPublications = await getOrgPublications(slug, {
    page,
    per_page: NUM_PUBLICATIONS_PER_PAGE
  });

  return { organization, organizationPublications, page };
}

export function meta({
  loaderData
}: {
  loaderData: {
    organization: Organization;
    organizationPublications: PaginatedPublications;
    page: number;
  };
}) {
  const { organization } = loaderData;
  return [
    { title: `${organization.name} | The Stacks` },
    { property: "og:title", content: organization.name },
    { property: "og:description", content: organization.profile },
    { name: "description", content: organization.profile },
    { property: "og:image", content: assetUrl(organization.avatar) },
    { name: "twitter:image", content: assetUrl(organization.avatar) }
  ];
}

export default function OrganizationPage({
  loaderData
}: {
  loaderData: {
    organization: Organization;
    organizationPublications: PaginatedPublications;
    page: number;
  };
}) {
  const { organization, organizationPublications, page } = loaderData;

  const navigate = useAppNavigate();
  const paginate = usePaginationTransition();
  const [searchParams] = useSearchParams();
  const location = useLocation();

  const pageHref = useCallback(
    (newPage: number) => {
      const newSearchParams = new URLSearchParams(searchParams);
      if (newPage > 1) {
        newSearchParams.set("page", String(newPage));
      } else {
        newSearchParams.delete("page");
      }
      const queryString = newSearchParams.toString();
      return queryString
        ? `${location.pathname}?${queryString}`
        : location.pathname;
    },
    [searchParams, location.pathname]
  );

  const handlePageChange = useCallback(
    (newPage: number) => {
      paginate(newPage > page ? "next" : "prev", () =>
        navigate(pageHref(newPage), { preventScrollReset: true })
      );
    },
    [navigate, pageHref, paginate, page]
  );

  const totalItems = organizationPublications?.pagination.total ?? 0;
  const totalPages = Math.ceil(totalItems / NUM_PUBLICATIONS_PER_PAGE);
  const profileUrl = `https://thestacks.org/organizations/${organization.slug}`;

  const rorBadge = organization.ror_id ? (
    <a
      href={`https://ror.org/${organization.ror_id}`}
      title={`View ${organization.name} on ROR`}
      target="_blank"
      rel="noopener noreferrer"
      className="shrink-0"
    >
      <RORIcon className="h-5 w-8 md:h-6 md:w-10" />
    </a>
  ) : null;

  const actions = (
    <ShareProfileButton title={organization.name} url={profileUrl} />
  );

  return (
    <div>
      <ProfilePageHeader
        name={organization.name}
        avatar={organization.avatar}
        subtitle={`Member since ${formatDate(organization.created_at, "MMM YYYY")}`}
        badge={rorBadge}
        chip={
          <Chip className="bg-warm-sand-400">Publications: {totalItems}</Chip>
        }
        bio={organization.profile}
        actions={actions}
        className="bg-page-header"
      />

      {/* Publications. */}
      <div className="max-w-container mx-auto flex flex-col gap-28 px-4 py-20 md:px-8">
        <PublicationsSection
          heading={
            <div className="flex items-start gap-2">
              <h2 className="text-fg-strong text-headline-30 font-serif">
                Publications
              </h2>
              <span className="bg-gray-blue-900 text-caption-20 text-fg-inverted mt-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 font-mono">
                {totalItems}
              </span>
            </div>
          }
          publications={organizationPublications?.items ?? []}
        />
        {totalItems > 0 && (
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        )}
      </div>
    </div>
  );
}
