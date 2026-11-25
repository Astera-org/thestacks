import { listPublications } from "@/api/publications";
import {
  ArrowRightIcon,
  CloseIcon,
  SearchIcon,
  SpinnerIcon
} from "@/components/icons";
import Link from "@/components/Link";
import PublicationsSection from "@/components/PublicationsSection";
import IconButton from "@/components/stacks-ui/IconButton";
import { Pagination } from "@/components/stacks-ui/Pagination";
import useAppNavigate from "@/hooks/useAppNavigate";
import { usePaginationTransition } from "@/hooks/usePaginationTransition";
import { PaginatedPublications } from "@/types";
import { useCallback, useRef, useState } from "react";
import {
  useNavigation,
  useSearchParams,
  type NavigateOptions
} from "react-router";

const NUM_PUBLICATIONS_PER_PAGE = 12;

interface SearchBarProps {
  searchQuery: string;
  handleSearch: (query: string) => void;
  onSubmit?: () => void;
  onClear?: () => void;
  hasActiveSearch?: boolean;
  isLoading?: boolean;
  className?: string;
}

function SearchBar(props: SearchBarProps) {
  const {
    searchQuery,
    handleSearch,
    onSubmit,
    onClear,
    hasActiveSearch,
    isLoading
  } = props;
  const inputRef = useRef<HTMLInputElement>(null);

  const clearSearch = () => {
    onClear?.();
    inputRef.current?.focus();
  };

  return (
    <div className="bg-surface flex h-15 items-center gap-3 rounded-xl pr-2 pl-3 shadow-md md:pl-6">
      <SearchIcon className="size-6 shrink-0" />
      <label htmlFor="search" className="sr-only">
        Search publications and authors
      </label>
      <input
        ref={inputRef}
        type="text"
        placeholder="Search publications and authors"
        value={searchQuery}
        onChange={(e) => handleSearch(e.target.value)}
        id="search"
        enterKeyHint="search"
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            onSubmit?.();
          }
          if (e.key === "Escape" && searchQuery) {
            clearSearch();
          }
        }}
        className="text-caption-50 h-full w-full appearance-none truncate rounded-none border-none p-0 font-mono shadow-none"
      />
      <div className="flex shrink-0 items-center gap-1">
        {(searchQuery || hasActiveSearch) && !isLoading && (
          <IconButton
            size="lg"
            intent="secondary"
            icon={<CloseIcon />}
            onClick={clearSearch}
            aria-label="Clear search"
          />
        )}
        <IconButton
          size="lg"
          className="hidden md:inline-flex"
          icon={
            isLoading ? (
              <SpinnerIcon className="animate-spin" />
            ) : (
              <ArrowRightIcon />
            )
          }
          onClick={() => onSubmit?.()}
          disabled={isLoading || !searchQuery.trim()}
          aria-label="Search"
        />
      </div>
    </div>
  );
}

interface LoaderData {
  publications: PaginatedPublications;
  searchQuery: string;
  page: number;
}

export async function loader({ request }: { request: Request }) {
  const url = new URL(request.url);
  const searchQuery = url.searchParams.get("search") || "";
  const pageParam = url.searchParams.get("page");
  const page = pageParam ? Math.max(1, parseInt(pageParam, 10) || 1) : 1;

  // Determine if this is a tag search or a regular search.
  let publications: PaginatedPublications;

  if (searchQuery && searchQuery.toLowerCase().startsWith("tag:")) {
    const tagName = searchQuery.slice(4).trim();
    publications = await listPublications({
      t: tagName || undefined,
      page,
      per_page: NUM_PUBLICATIONS_PER_PAGE
    });
  } else {
    publications = await listPublications({
      q: searchQuery || undefined,
      page,
      per_page: NUM_PUBLICATIONS_PER_PAGE
    });
  }

  return { publications, searchQuery, page };
}

export function meta({ loaderData }: { loaderData: LoaderData }) {
  const { searchQuery } = loaderData;

  const title = searchQuery
    ? `Search: ${searchQuery} | The Stacks`
    : "The Stacks";
  const description = searchQuery
    ? `Search results for "${searchQuery}" on The Stacks`
    : "An experimental new publishing platform. Browse the latest research.";

  return [
    { title },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { name: "description", content: description }
  ];
}

export default function HomePage({ loaderData }: { loaderData: LoaderData }) {
  const { publications, searchQuery: initialSearchQuery, page } = loaderData;

  const navigate = useAppNavigate();
  const paginate = usePaginationTransition();
  const navigation = useNavigation();
  const [searchParams] = useSearchParams();

  // A search is in flight when a navigation to the home route is loading with a
  // different "search" param than the one currently rendered.
  const isSearching =
    navigation.state === "loading" &&
    navigation.location?.pathname === "/" &&
    new URLSearchParams(navigation.location.search).get("search") !==
      (searchParams.get("search") ?? null);

  const [localSearchQuery, setLocalSearchQuery] = useState(initialSearchQuery);

  const [prevInitialSearchQuery, setPrevInitialSearchQuery] =
    useState(initialSearchQuery);
  if (initialSearchQuery !== prevInitialSearchQuery) {
    setPrevInitialSearchQuery(initialSearchQuery);
    setLocalSearchQuery(initialSearchQuery);
  }

  // Navigate with new search params.
  const navigateWithParams = useCallback(
    (params: { search?: string; page?: number }, options?: NavigateOptions) => {
      const newSearchParams = new URLSearchParams(searchParams);

      if (params.search !== undefined) {
        if (params.search.trim()) {
          newSearchParams.set("search", params.search);
        } else {
          newSearchParams.delete("search");
        }
        // Reset to page 1 when search changes.
        newSearchParams.delete("page");
      }

      if (params.page !== undefined && params.page > 1) {
        newSearchParams.set("page", String(params.page));
      } else if (params.page === 1) {
        newSearchParams.delete("page");
      }

      const queryString = newSearchParams.toString();
      navigate(queryString ? `?${queryString}` : "/", options);
    },
    [navigate, searchParams]
  );

  // Handle search submission.
  const handleSearchSubmit = useCallback(() => {
    navigateWithParams({ search: localSearchQuery });
  }, [localSearchQuery, navigateWithParams]);

  // Clear the field and reset the list to its unfiltered state.
  const handleSearchClear = useCallback(() => {
    setLocalSearchQuery("");
    navigateWithParams({ search: "" });
  }, [navigateWithParams]);

  // Handle page change.
  const handlePageChange = useCallback(
    (newPage: number) => {
      paginate(newPage > page ? "next" : "prev", () =>
        navigateWithParams({ page: newPage }, { preventScrollReset: true })
      );
    },
    [navigateWithParams, paginate, page]
  );

  const totalItems = publications?.pagination.total ?? 0;
  const totalPages = Math.ceil(totalItems / NUM_PUBLICATIONS_PER_PAGE);

  return (
    <div>
      {/* Hero section. */}
      <section className="bg-gray-300">
        <div className="max-w-container mx-auto w-full px-4 py-14 md:px-8 md:py-28">
          <h1 className="text-headline-60 mb-10 font-serif">
            An experimental new publishing platform. <br />
            Browse the latest research.
          </h1>
          <p className="text-fg-muted text-body-50">
            The Stacks is in beta and only available to select users at this
            time.{" "}
            <Link className="underline underline-offset-4" to="/about">
              Learn more.
            </Link>
          </p>
        </div>
      </section>
      {/* Search field. */}
      <div className="max-w-container mx-auto w-full -translate-y-1/2 px-4 md:px-8">
        <SearchBar
          searchQuery={localSearchQuery}
          handleSearch={setLocalSearchQuery}
          onSubmit={handleSearchSubmit}
          onClear={handleSearchClear}
          hasActiveSearch={!!searchParams.get("search")}
          isLoading={isSearching}
        />
      </div>

      {/* Main content. */}
      <div className="max-w-container mx-auto flex flex-col gap-28 px-4 py-10 md:px-8">
        <PublicationsSection
          heading={
            <h2 className="text-fg-strong text-headline-30 font-serif">
              {initialSearchQuery
                ? `Search results for "${initialSearchQuery}"`
                : "Latest publications"}
            </h2>
          }
          publications={publications?.items ?? []}
        />
        {/* Pagination. */}
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
