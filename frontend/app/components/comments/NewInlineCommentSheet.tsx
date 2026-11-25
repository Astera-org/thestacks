import { createComment, getComment } from "@/api/comments";
import { AnchorTextContent } from "@/components/comments/CommentBox";
import CommentEditor from "@/components/comments/CommentEditor";
import InlineCommentSheetShell from "@/components/comments/InlineCommentSheetShell";
import { hashAnchorText } from "@/hooks/useCommentDraft";
import { Comment } from "@/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export interface NewCommentAnchor {
  anchor_text: string;
  pre_text: string;
  post_text: string;
  is_code?: boolean;
  anchor_html?: string | null;
}

interface NewInlineCommentSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  publicationId: number;
  anchor: NewCommentAnchor;
  onNewCommentSuccess?: (newComment: Comment) => void;
}

export default function NewInlineCommentSheet({
  open,
  onOpenChange,
  publicationId,
  anchor,
  onNewCommentSuccess
}: NewInlineCommentSheetProps) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (body: string) => {
      const { comment_id } = await createComment(publicationId, {
        body,
        anchor_text: anchor.anchor_text,
        pre_text: anchor.pre_text,
        post_text: anchor.post_text
      });
      const comment = await getComment(comment_id);
      return { ...comment, publication_id: publicationId };
    },
    onSuccess: (newComment) => {
      queryClient.invalidateQueries({
        queryKey: ["comments", publicationId]
      });
      onNewCommentSuccess?.(newComment);
    }
  });

  return (
    <InlineCommentSheetShell
      open={open}
      onOpenChange={onOpenChange}
      title="Add inline comment"
      description="Write an inline comment on the selected text"
    >
      <div className="inline-comment-anchor-text">
        <blockquote>
          {anchor.anchor_html?.includes("katex-display") ? (
            <div className="bg-sky-blue-500/70">
              <AnchorTextContent
                text={anchor.anchor_text}
                isCode={anchor.is_code}
                html={anchor.anchor_html}
              />
            </div>
          ) : (
            <span className="bg-sky-blue-500/70">
              &ldquo;
              <AnchorTextContent
                text={anchor.anchor_text}
                isCode={anchor.is_code}
                html={anchor.anchor_html}
              />
              &rdquo;
            </span>
          )}
        </blockquote>
      </div>

      <CommentEditor
        autoFocus
        name="new-inline-comment"
        draftKey={`comment-draft:${publicationId}:inline:${hashAnchorText(anchor.anchor_text)}`}
        placeholder="Leave a comment on this text..."
        submitLabel={mutation.isPending ? "Posting…" : "Submit"}
        disabled={mutation.isPending}
        onCancel={() => onOpenChange(false)}
        onSubmit={(body) =>
          new Promise<void>((resolve, reject) => {
            mutation.mutate(body, {
              onSuccess: () => resolve(),
              onError: (e) => reject(e as Error)
            });
          })
        }
      />
    </InlineCommentSheetShell>
  );
}
