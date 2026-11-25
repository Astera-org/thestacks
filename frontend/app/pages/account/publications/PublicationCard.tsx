import { ChatBubbleIcon, PencilIcon } from "@/components/icons";
import Link from "@/components/Link";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import Chip from "@/components/stacks-ui/Chip";
import { useOpenEditor } from "@/hooks/useOpenEditor";
import { toSentenceCase } from "@/lib/utils";

export interface PublicationCardProps {
  /** Pill label, e.g. the publication tag or state ("Resource"). */
  tag?: string;
  /** Right-aligned meta line, e.g. "Edited: Sep 25, 2025". */
  meta: string;
  title: string;
  slug: string;
  /**
   * Released publications open the reader from the card and the editor from
   * the "Edit" action. Drafts open the editor from the whole card, so "Edit"
   * is just an affordance.
   */
  isPublished?: boolean;
  /** Released publications show a comment count; drafts omit it. */
  numComments?: number;
}

export default function PublicationCard(props: PublicationCardProps) {
  const { tag, meta, title, slug, isPublished, numComments } = props;

  const readerLink = `/publications/${slug}`;
  const { openEditor, isOpening } = useOpenEditor(slug);

  return (
    <article className="bg-warm-sand-300 relative flex flex-col gap-5 rounded-lg px-6 py-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {tag && (
            <Chip size="sm" className="bg-white/60">
              {toSentenceCase(tag)}
            </Chip>
          )}
          <span className="text-caption-40 text-fg-strong shrink-0 font-mono">
            {meta}
          </span>
          {numComments != null && (
            <span className="text-caption-40 text-fg-strong flex shrink-0 items-center gap-1.5 font-mono">
              <ChatBubbleIcon width={14} height={14} />
              {numComments}
            </span>
          )}
        </div>

        {isPublished ? (
          <button
            type="button"
            aria-busy={isOpening}
            disabled={isOpening}
            onClick={openEditor}
            className="text-fg-strong text-caption-40 relative z-10 flex shrink-0 items-center gap-2 font-mono hover:underline hover:underline-offset-4 disabled:opacity-60"
          >
            {isOpening ? <LoadingSpinner /> : <PencilIcon className="size-4" />}
            Edit
          </button>
        ) : (
          <span className="text-fg-strong text-caption-40 flex shrink-0 items-center gap-2 font-mono">
            {isOpening ? <LoadingSpinner /> : <PencilIcon className="size-4" />}
            Edit
          </span>
        )}
      </div>

      <h3 className="text-headline-20 text-fg-strong min-w-0 font-serif">
        {isPublished ? (
          <Link
            to={readerLink}
            className="after:absolute after:inset-0 after:rounded-lg after:content-[''] hover:underline hover:decoration-1 hover:underline-offset-4"
          >
            <MarkdownRenderer markdown={title} isAnchorChild />
          </Link>
        ) : (
          <button
            type="button"
            aria-busy={isOpening}
            disabled={isOpening}
            onClick={openEditor}
            className="text-left after:absolute after:inset-0 after:rounded-lg after:content-[''] hover:underline hover:decoration-1 hover:underline-offset-4 disabled:opacity-60"
          >
            <MarkdownRenderer markdown={title} isAnchorChild />
          </button>
        )}
      </h3>
    </article>
  );
}
