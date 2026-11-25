import CommentForm from "@/components/comments/CommentForm";
import CommentList from "@/components/comments/CommentList";
import BoxedCollapsible from "@/components/publication/BoxedCollapsible";
import { Separator } from "@/components/ui/separator";
import type { Comment, ContributorWithRoles } from "@/types";
import { useQueryClient } from "@tanstack/react-query";

interface CommentsSectionProps {
  publicationId: number;
  /** Top-level comments, used for the count and empty state. */
  comments: Comment[];
  contributorsWithRoles: ContributorWithRoles[];
  /** Controlled open state of the whole comments section. */
  isOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
  className?: string;
}

export default function CommentsSection({
  publicationId,
  comments,
  contributorsWithRoles,
  isOpen = false,
  onOpenChange,
  className
}: CommentsSectionProps) {
  const queryClient = useQueryClient();

  return (
    <BoxedCollapsible
      id="comments"
      label="comments"
      variant="primary"
      title={
        <span>
          Comments <span className="text-fg-muted">({comments.length})</span>
        </span>
      }
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      className={className}
    >
      <div className="@container w-full md:max-w-204">
        <CommentForm
          publicationId={publicationId}
          onSuccess={() =>
            queryClient.invalidateQueries({
              queryKey: ["comments", publicationId]
            })
          }
          className="mt-4 mb-6"
        />
        {comments.length > 0 ? (
          <>
            <Separator className="mt-4 mb-10" />
            <CommentList
              publicationId={publicationId}
              contributorsWithRoles={contributorsWithRoles}
            />
          </>
        ) : (
          <p className="text-carbon-500 mt-2 text-[15px] leading-5 md:text-[18px] md:leading-6">
            Be the first to comment on this publication.
          </p>
        )}
      </div>
    </BoxedCollapsible>
  );
}
