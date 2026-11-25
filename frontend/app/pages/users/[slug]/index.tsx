import { getUser, getUserPublications } from "@/api/users";
import OrcidProfileLink from "@/components/OrcidProfileLink";
import ProfilePageHeader from "@/components/ProfilePageHeader";
import PublicationsSection from "@/components/PublicationsSection";
import Chip from "@/components/stacks-ui/Chip";
import { Pagination } from "@/components/stacks-ui/Pagination";
import useAppNavigate from "@/hooks/useAppNavigate";
import { usePaginationTransition } from "@/hooks/usePaginationTransition";
import { formatDate } from "@/lib/utils";
import { PaginatedPublications, User } from "@/types";
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
  try {
    const username = params.slug;
    const url = new URL(request.url);
    const pageParam = url.searchParams.get("page");
    const page = pageParam ? Math.max(1, parseInt(pageParam, 10) || 1) : 1;

    const user = await getUser(username);
    const userPublications = await getUserPublications(user.id, {
      page,
      per_page: NUM_PUBLICATIONS_PER_PAGE
    });

    return { user, userPublications, page };
  } catch (error) {
    console.error(error);
    throw redirect("/not-found", { status: 404 });
  }
}

export function meta({
  loaderData
}: {
  loaderData: {
    user: User;
    userPublications: PaginatedPublications;
    page: number;
  };
}) {
  const { user } = loaderData;
  const userDisplayName = `${user.first_name} ${user.last_name}`;
  return [
    { title: `${userDisplayName} | The Stacks` },
    { property: "og:title", content: userDisplayName },
    {
      property: "og:description",
      content: user.profile || `${userDisplayName} on The Stacks.`
    },
    {
      name: "description",
      content: user.profile || `${userDisplayName} on The Stacks.`
    },
    { property: "og:image", content: user.avatar },
    { name: "twitter:image", content: user.avatar },
    { name: "twitter:card", content: "summary" },
    { name: "twitter:title", content: userDisplayName },
    {
      name: "twitter:description",
      content: user.profile || `${userDisplayName} on The Stacks.`
    },

    { property: "og:type", content: "profile" },
    { property: "profile:first_name", content: user.first_name },
    { property: "profile:last_name", content: user.last_name },
    { property: "profile:username", content: user.username }
  ];
}

export default function UserPage({
  loaderData
}: {
  loaderData: {
    user: User;
    userPublications: PaginatedPublications;
    page: number;
  };
}) {
  const { user, userPublications, page } = loaderData;

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

  const totalItems = userPublications?.pagination.total ?? 0;
  const totalPages = Math.ceil(totalItems / NUM_PUBLICATIONS_PER_PAGE);
  const displayName = `${user.first_name} ${user.last_name}`;

  const orcidBadge = user.orcid ? (
    <OrcidProfileLink orcid={user.orcid} />
  ) : null;

  return (
    <div>
      <ProfilePageHeader
        name={displayName}
        avatar={user.avatar}
        subtitle={`Member since ${formatDate(user.created_at, "MMM YYYY")}`}
        badge={orcidBadge}
        chip={<Chip>Publications: {totalItems}</Chip>}
        bio={user.profile}
        className="bg-sky-blue-200"
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
          publications={userPublications?.items ?? []}
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
