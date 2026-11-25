import { ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";
import IconButton from "@/components/stacks-ui/IconButton";
import { cn } from "@/lib/utils";

const NUM_PAGES_AROUND_CURRENT = 2;

function generatePageNumbers(currentPage: number, totalPages: number) {
  const pages: (number | "ellipsis")[] = [];

  // Always show first page.
  pages.push(1);

  // Determine the range around current page.
  const startRange = Math.max(currentPage - NUM_PAGES_AROUND_CURRENT, 1);
  const endRange = Math.min(currentPage + NUM_PAGES_AROUND_CURRENT, totalPages);

  // Add ellipsis after first page if needed.
  if (startRange > 2) {
    pages.push("ellipsis");
  }

  // Add pages in the range around current page.
  for (let i = startRange; i <= endRange; i++) {
    if (i !== 1 && i !== totalPages) {
      pages.push(i);
    }
  }

  // Add ellipsis before last page if needed.
  if (endRange < totalPages - 1) {
    pages.push("ellipsis");
  }

  // Always show last page (if it's not the first page).
  if (totalPages > 1) {
    pages.push(totalPages);
  }

  return pages;
}

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function Pagination(props: PaginationProps) {
  const { currentPage, totalPages, onPageChange, className } = props;

  // Nothing to paginate through: render nothing for a single (or empty) page.
  if (totalPages <= 1) {
    return null;
  }

  const pageNumbers = generatePageNumbers(currentPage, totalPages);
  const isPrevDisabled = currentPage <= 1;
  const isNextDisabled = currentPage >= totalPages;

  return (
    <nav
      aria-label="Pagination"
      className={cn(
        "text-body-30 flex w-full items-center justify-between md:justify-center md:gap-8",
        className
      )}
    >
      {/* Previous page button. */}
      <IconButton
        size="md"
        aria-label="Previous page"
        disabled={isPrevDisabled}
        onClick={() => onPageChange(currentPage - 1)}
        icon={<ChevronLeftIcon className="size-5" />}
      />

      <ul className="flex items-center gap-5">
        {/* Page numbers and ellipses. */}
        {pageNumbers.map((page, index) => {
          if (page === "ellipsis") {
            return (
              <li
                key={`ellipsis-${index}`}
                aria-hidden="true"
                className="select-none"
              >
                ...
              </li>
            );
          }

          const isCurrent = page === currentPage;

          return (
            <li key={page}>
              <button
                type="button"
                aria-label={
                  isCurrent
                    ? `Page ${page}, current page`
                    : `Go to page ${page}`
                }
                aria-current={isCurrent ? "page" : undefined}
                className={cn(
                  "relative p-2",
                  isCurrent &&
                    "after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-current after:content-['']"
                )}
                onClick={() => {
                  if (!isCurrent) {
                    onPageChange(page);
                  }
                }}
              >
                {page}
              </button>
            </li>
          );
        })}
      </ul>

      {/* Next page button. */}
      <IconButton
        size="md"
        aria-label="Next page"
        disabled={isNextDisabled}
        onClick={() => onPageChange(currentPage + 1)}
        icon={<ChevronRightIcon className="size-5" />}
      />
    </nav>
  );
}
