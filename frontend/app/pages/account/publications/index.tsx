import { myDrafts } from "@/api/publications";
import { getUserPublications } from "@/api/users";
import { BookIcon, SpinnerIcon } from "@/components/icons";
import Link from "@/components/Link";
import Button from "@/components/stacks-ui/Button";
import NoResults from "@/components/stacks-ui/NoResults";
import { Pagination } from "@/components/stacks-ui/Pagination";
import { useAuth } from "@/hooks/useAuth";
import { cn, formatDate } from "@/lib/utils";
import { PaginatedDrafts, PaginatedPublications } from "@/types";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import PublicationCard from "./PublicationCard";

// Match the organization profile page size.
const PER_PAGE = 6;

type Tab = "drafts" | "released";

export function meta() {
  return [{ title: "Publications | Account | The Stacks" }];
}

export default function AccountPublicationsPage() {
  const { user } = useAuth();

  const [tab, setTab] = useState<Tab>("drafts");
  const [draftsPage, setDraftsPage] = useState(1);
  const [releasedPage, setReleasedPage] = useState(1);

  // Server-side pagination: the page is part of each query key, so changing
  // pages refetches that slice.
  const draftsQuery = useQuery<PaginatedDrafts>({
    queryKey: ["my_drafts", { page: draftsPage, perPage: PER_PAGE }],
    queryFn: () => myDrafts({ page: draftsPage, per_page: PER_PAGE }),
    enabled: !!user
  });

  const releasedQuery = useQuery<PaginatedPublications>({
    queryKey: ["user_publications", user?.id, releasedPage],
    queryFn: () =>
      getUserPublications(user!.id, {
        page: releasedPage,
        per_page: PER_PAGE
      }),
    enabled: !!user
  });

  const isDrafts = tab === "drafts";
  const activeQuery = isDrafts ? draftsQuery : releasedQuery;
  const total = activeQuery.data?.pagination.total ?? 0;
  const totalPages = Math.ceil(total / PER_PAGE);
  const page = isDrafts ? draftsPage : releasedPage;
  const setPage = isDrafts ? setDraftsPage : setReleasedPage;

  const drafts = draftsQuery.data?.items ?? [];
  const released = releasedQuery.data?.items ?? [];

  const tabs: { value: Tab; label: string }[] = [
    { value: "drafts", label: "Drafts" },
    { value: "released", label: "Released publications" }
  ];

  return (
    <div>
      {/* The active tab already titles the section; kept for the heading outline. */}
      <h2 className="sr-only">Publications</h2>

      <div className="flex flex-col gap-10 md:flex-row md:gap-12">
        {/* Sub-navigation. Switches the list in place, so it is local state
            rather than routes. */}
        <nav className="shrink-0 md:w-56">
          <ul className="flex flex-col">
            {tabs.map((t) => (
              <li key={t.value}>
                <button
                  type="button"
                  onClick={() => setTab(t.value)}
                  aria-current={tab === t.value ? "true" : undefined}
                  className={cn(
                    "border-gray-blue-100 text-body-30 w-full border-b py-3 text-left transition-colors",
                    tab === t.value
                      ? "text-fg-strong"
                      : "text-fg-subtle hover:text-fg-strong"
                  )}
                >
                  {t.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* List. */}
        <div className="min-w-0 flex-1">
          <h3 className="text-body-70 text-fg-strong mb-6">
            {isDrafts ? "Your drafts" : "Your released publications"}{" "}
            {!activeQuery.isLoading && !activeQuery.isError && (
              <span className="text-fg-subtle">({total})</span>
            )}
          </h3>

          {activeQuery.isLoading ? (
            <div role="status" className="flex justify-center py-16">
              <SpinnerIcon className="size-5 animate-spin" />
              <span className="sr-only">Loading publications</span>
            </div>
          ) : activeQuery.isError ? (
            <p className="text-body-20 text-fg-subtle">
              Failed to load publications. Please try again.
            </p>
          ) : isDrafts ? (
            drafts.length === 0 ? (
              <NoResults
                icon={BookIcon}
                title="No drafts yet"
                description="Start writing your first draft."
                action={
                  <Button asChild>
                    <Link to="/publications/new">Create publication</Link>
                  </Button>
                }
              />
            ) : (
              <ul key="drafts" className="flex flex-col gap-4">
                {drafts.map((draft) => (
                  <li key={`${draft.slug}-draft`}>
                    <PublicationCard
                      tag="Resource"
                      meta={`Edited: ${formatDate(draft.created_at, "MMM D, YYYY")}`}
                      title={draft.title || "Untitled draft"}
                      slug={draft.slug}
                      isPublished={false}
                    />
                  </li>
                ))}
              </ul>
            )
          ) : released.length === 0 ? (
            <NoResults
              icon={BookIcon}
              title="No publications yet"
              description="Your published publications will appear here."
            />
          ) : (
            <ul key="published" className="flex flex-col gap-4">
              {released.map((publication) => (
                <li key={`${publication.slug}-pub`}>
                  <PublicationCard
                    tag={publication.tags?.[0] ?? "Publication"}
                    meta={formatDate(publication.created_at, "MMM D, YYYY")}
                    title={publication.title}
                    slug={publication.slug}
                    isPublished={true}
                    numComments={publication.num_comments}
                  />
                </li>
              ))}
            </ul>
          )}

          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
            className="pt-16"
          />
        </div>
      </div>
    </div>
  );
}
