import { BookIcon, ChatBubbleIcon } from "@/components/icons";
import Link from "@/components/Link";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import PublicationTag from "@/components/publication/PublicationTag";
import NoResults from "@/components/stacks-ui/NoResults";
import OrganizationBadge from "@/components/stacks-ui/OrganizationBadge";
import {
  cn,
  filterPublicationTypeTags,
  formatDate,
  isCurrentYear
} from "@/lib/utils";
import type { Publication } from "@/types";

export interface PublicationCardGridProps {
  publications: Publication[];
  className?: string;
}

export default function PublicationCardGrid(props: PublicationCardGridProps) {
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
    <div
      className={cn(
        "grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-3",
        className
      )}
    >
      {publications.map((publication) => {
        const publicationTypeTags = filterPublicationTypeTags(
          publication.tags ?? []
        ).slice(0, 2);
        const formattedDate = formatDate(
          publication.created_at,
          isCurrentYear(publication.created_at) ? "MMM D" : "MMM D, YYYY"
        );
        const org = publication.orgs?.[0];

        return (
          <div
            key={publication.id}
            className="bg-warm-sand-300 hover:shadow-lift active:shadow-press relative flex min-h-80 flex-col gap-6 rounded-xl p-4 transition duration-120 ease-out motion-safe:hover:-translate-y-0.5 motion-safe:active:translate-y-0 md:min-h-105 md:gap-12 md:p-8"
          >
            {(publicationTypeTags.length > 0 || formattedDate) && (
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex flex-wrap gap-2">
                  {publicationTypeTags.map((tag) => (
                    <PublicationTag
                      key={tag}
                      tag={tag}
                      variant="card"
                      onClick={(e) => e.stopPropagation()}
                    />
                  ))}
                </div>
                {formattedDate && (
                  <span className="text-caption-40 text-fg-strong ml-auto font-mono whitespace-nowrap">
                    {formattedDate}
                  </span>
                )}
              </div>
            )}

            <h3 className="text-headline-20 text-fg-strong font-serif">
              <Link
                to={`/publications/${publication.slug}`}
                className="underline-wipe hover:underline-wipe-full after:absolute after:inset-0 after:rounded-xl after:content-['']"
              >
                <MarkdownRenderer markdown={publication.title} isAnchorChild />
              </Link>
            </h3>

            <div className="mt-auto flex items-center justify-between gap-3">
              {org && (
                <OrganizationBadge
                  organization={org}
                  className="text-fg-strong relative z-10"
                />
              )}
              <span className="text-caption-50 text-fg-strong ml-auto flex items-center gap-2 font-mono">
                <ChatBubbleIcon width={14} height={14} />
                {publication.num_comments}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
