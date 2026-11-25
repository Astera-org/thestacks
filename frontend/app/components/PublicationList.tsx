import { BookIcon, ChatBubbleIcon } from "@/components/icons";
import Link from "@/components/Link";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import PublicationTag from "@/components/publication/PublicationTag";
import NoResults from "@/components/stacks-ui/NoResults";
import {
  cn,
  filterPublicationTypeTags,
  formatDate,
  isCurrentYear
} from "@/lib/utils";
import type { Publication } from "@/types";

export interface PublicationListProps {
  publications: Publication[];
  className?: string;
}

// Abstract-led feed: each row leads with the title, shows two lines of the
// abstract, then an inline meta bar (type · org · date, responses right).
// The whole row links to the publication.
//
// Rows bleed out under the page gutter (`-mx-4 px-4`) so the hover surface has
// padding around the text without moving the text itself. That widens the row
// past the text column, so the divider is an inset pseudo-element rather than
// `divide-y` on the container, which would stretch it to the bled width.
export default function PublicationList(props: PublicationListProps) {
  const { publications, className } = props;

  if (publications.length === 0) {
    return (
      <NoResults
        icon={BookIcon}
        title="No publications found"
        description="There's nothing to read here yet. Check back soon for new work."
      />
    );
  }

  return (
    <div className={cn("flex flex-col", className)}>
      {publications.map((publication) => {
        const publicationTypeTags = filterPublicationTypeTags(
          publication.tags ?? []
        ).slice(0, 1);
        const formattedDate = formatDate(
          publication.created_at,
          isCurrentYear(publication.created_at) ? "MMM D" : "MMM D, YYYY"
        );
        const orgName = publication.orgs?.[0]?.name;

        return (
          <Link
            key={publication.id}
            to={`/publications/${publication.slug}`}
            className="group hover:shadow-lift active:shadow-press before:bg-gray-blue-900/10 relative -mx-4 block rounded-xl px-4 py-6 transition duration-120 ease-out before:absolute before:inset-x-4 before:top-0 before:h-px before:transition-opacity before:duration-120 before:content-[''] first:before:hidden hover:z-10 hover:before:opacity-0 motion-safe:hover:-translate-y-0.5 motion-safe:active:translate-y-0 md:-mx-6 md:px-6 md:py-8 md:before:inset-x-6"
          >
            <h3 className="text-headline-20 text-fg-strong underline-wipe group-hover:underline-wipe-full font-serif">
              <MarkdownRenderer markdown={publication.title} isAnchorChild />
            </h3>

            {publication.abstract && (
              <div className="text-body-40 text-fg-muted mt-2.5 line-clamp-2">
                <MarkdownRenderer
                  markdown={publication.abstract}
                  isAnchorChild
                />
              </div>
            )}

            <div className="text-caption-30 text-fg-subtle mt-3.5 flex items-center gap-2 font-mono md:mt-4">
              <div className="flex min-w-0 items-center gap-2">
                {publicationTypeTags.map((tag) => (
                  <PublicationTag key={tag} tag={tag} variant="list" />
                ))}
                {publicationTypeTags.length > 0 &&
                  (orgName || formattedDate) && <MetaDot />}
                {orgName && <span className="truncate">{orgName}</span>}
                {orgName && formattedDate && <MetaDot />}
                {formattedDate && (
                  <span className="whitespace-nowrap">{formattedDate}</span>
                )}
              </div>
              <span className="ml-auto flex items-center gap-1.5 whitespace-nowrap">
                <ChatBubbleIcon width={14} height={14} />
                {publication.num_comments}
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

function MetaDot() {
  return (
    <span className="text-carbon-200" aria-hidden>
      ·
    </span>
  );
}
