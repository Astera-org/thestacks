import { listComments } from "@/api/comments";
import CommentBox, {
  CommentAnchorText,
  CommentReply
} from "@/components/comments/CommentBox";
import { Separator } from "@/components/ui/separator";
import { buildCommentTree } from "@/lib/comments/buildCommentTree";
import { ContributorWithRoles } from "@/types";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useState } from "react";

interface CommentListProps {
  publicationId: number;
  contributorsWithRoles: ContributorWithRoles[];
}

export default function CommentList(props: CommentListProps) {
  const { publicationId, contributorsWithRoles } = props;

  const {
    data: comments,
    isLoading,
    error
  } = useQuery({
    queryKey: ["comments", publicationId],
    queryFn: () => listComments(publicationId, { per_page: 250 })
  });

  const [replyingToCommentId, setReplyingToCommentId] = useState<number | null>(
    null
  );
  const onShowReplyInput = useCallback((id: number | null) => {
    setReplyingToCommentId(id);
    if (id !== null) {
      const el = document.getElementById(`reply-to-${id}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, []);

  const commentTree = buildCommentTree(comments?.items ?? []);

  if (isLoading) {
    return <p className="text-aqua-blue-600 text-center">Loading comments …</p>;
  }

  if (error) {
    return (
      <p className="text-danger-500 text-center">
        Failed to load comments: {(error as Error).message}
      </p>
    );
  }

  if (commentTree.length === 0) {
    return null;
  }

  return (
    <div>
      {commentTree.map((comment) => (
        <div
          className="mb-6 last:mb-0 md:mb-8"
          key={comment.comment_id}
          data-comment-id={comment.comment_id}
        >
          <CommentAnchorText comment={comment} />
          <CommentBox
            comment={comment}
            isContributor={contributorsWithRoles.some(
              (c) => c.user_id === comment.user_id
            )}
            onShowReplyInput={onShowReplyInput}
            replyingToCommentId={comment.comment_id}
            isReplyInputShown={replyingToCommentId === comment.comment_id}
            replies={comment.replies}
          >
            {comment.replies &&
              comment.replies.map((reply, index) => (
                <div key={reply.comment_id}>
                  <CommentReply
                    comment={reply}
                    isContributor={contributorsWithRoles.some(
                      (contributor) => contributor.user_id === reply.user_id
                    )}
                    className={index === 0 ? "mt-4" : undefined}
                  />
                  {index < comment.replies!.length - 1 && (
                    <Separator className="my-8" />
                  )}
                </div>
              ))}
          </CommentBox>
          <Separator className="mt-8 mb-6" />
        </div>
      ))}
    </div>
  );
}
