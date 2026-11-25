import { createComment, getComment } from "@/api/comments";
import { CommentAuthContext } from "@/components/comments/CommentAuthProvider";
import CommentBox, {
  AnchorTextContent,
  CommentReply
} from "@/components/comments/CommentBox";
import CommentEditor from "@/components/comments/CommentEditor";
import InlineCommentSheetShell from "@/components/comments/InlineCommentSheetShell";
import Button from "@/components/stacks-ui/Button";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import { hashAnchorText } from "@/hooks/useCommentDraft";
import { useRevealCommentAnchor } from "@/hooks/useRevealCommentAnchor";
import { retryUntil } from "@/lib/commentNavigation";
import { Comment, CommentThread } from "@/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { use, useCallback, useEffect, useMemo, useState } from "react";

interface NewCommentAnchor {
  anchor_text: string;
  pre_text: string;
  post_text: string;
}

interface InlineCommentThreadsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  threads: CommentThread[];
  publicationId: number;
  contributors?: Array<{ user_id: number; roles: string[] }>;
  onCommentWithdrawn?: () => void;
  onNewThreadCreated?: (newComment: Comment) => void;
  /** When set, scroll to this comment (root or reply) within the sheet after it opens. */
  scrollToCommentId?: number;
}

export default function InlineCommentThreadsSheet({
  open,
  onOpenChange,
  threads,
  publicationId,
  contributors,
  onCommentWithdrawn,
  onNewThreadCreated,
  scrollToCommentId
}: InlineCommentThreadsSheetProps) {
  const { user } = useAuth();
  const isLoggedIn = user != null;
  const authContext = use(CommentAuthContext);

  const isContributor = useCallback(
    (userId: number) =>
      contributors?.some((c) => c.user_id === userId) ?? false,
    [contributors]
  );

  const queryClient = useQueryClient();
  const revealAnchor = useRevealCommentAnchor();
  const [newThreadFormGroup, setNewThreadFormGroup] = useState<number | null>(
    null
  );
  const [replyingToCommentId, setReplyingToCommentId] = useState<number | null>(
    null
  );

  useEffect(() => {
    if (!open || scrollToCommentId == null) return;

    // Scope to the sheet container so we don't match page-level comment
    // elements that exist in the (collapsed) CommentList.
    const handle = retryUntil(() => {
      const sheet = document.querySelector<HTMLElement>(
        '[data-testid="inline-comment-sheet"]'
      );
      if (!sheet) return false;

      const el =
        sheet.querySelector<HTMLElement>(
          `[data-comment-id="${scrollToCommentId}"]`
        ) ?? sheet.querySelector<HTMLElement>(`#thread-${scrollToCommentId}`);

      if (!el) return false;
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      return true;
    });

    return () => handle.cancel();
  }, [open, scrollToCommentId]);

  const totalComments = threads.reduce(
    (sum, t) => sum + t.replies.length + 1,
    0
  );

  const threadsByAnchor = useMemo(() => {
    const groups: Array<{ anchorText: string; threads: CommentThread[] }> = [];
    const seen = new Map<string, number>();

    for (const thread of threads) {
      const key = thread.root.anchor_text ?? "";
      const idx = seen.get(key);
      if (idx !== undefined) {
        groups[idx].threads.push(thread);
      } else {
        seen.set(key, groups.length);
        groups.push({ anchorText: key, threads: [thread] });
      }
    }

    return groups;
  }, [threads]);

  const newThreadMutation = useMutation({
    mutationFn: async ({
      body,
      anchor
    }: {
      body: string;
      anchor: NewCommentAnchor;
    }) => {
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
      setNewThreadFormGroup(null);
      queryClient.invalidateQueries({
        queryKey: ["comments", publicationId]
      });
      onNewThreadCreated?.(newComment);
    }
  });

  const onShowReplyInput = useCallback((id: number | null) => {
    setReplyingToCommentId(id);
  }, []);

  return (
    <InlineCommentSheetShell
      open={open}
      onOpenChange={onOpenChange}
      title="Inline comments"
      description={`${totalComments} inline comment${totalComments !== 1 ? "s" : ""} on highlighted text`}
    >
      {threadsByAnchor.map((group, groupIndex) => {
        const groupAnchor: NewCommentAnchor = {
          anchor_text: group.threads[0].root.anchor_text ?? "",
          pre_text: group.threads[0].root.pre_text ?? "",
          post_text: group.threads[0].root.post_text ?? ""
        };

        return (
          <div key={group.anchorText || groupIndex}>
            <button
              type="button"
              onClick={() =>
                void revealAnchor(group.threads[0].root.comment_id)
              }
              className="inline-comment-anchor-text"
            >
              <blockquote>
                <span className="bg-sky-blue-500/70">
                  &ldquo;
                  <AnchorTextContent
                    text={group.anchorText}
                    commentId={group.threads[0].root.comment_id}
                  />
                  &rdquo;
                </span>
              </blockquote>
            </button>

            {group.threads.map((thread, threadIndex) => {
              const orderedReplies = [...thread.replies].sort(
                (a, b) =>
                  new Date(a.created_at).getTime() -
                  new Date(b.created_at).getTime()
              );

              return (
                <div
                  key={thread.root.comment_id}
                  data-comment-id={thread.root.comment_id}
                >
                  <CommentBox
                    comment={thread.root}
                    isContributor={isContributor(thread.root.user_id)}
                    isReplyInputShown={
                      replyingToCommentId === thread.root.comment_id
                    }
                    onWithdrawn={onCommentWithdrawn}
                    onShowReplyInput={onShowReplyInput}
                    replyingToCommentId={thread.root.comment_id}
                    replies={orderedReplies}
                  >
                    {orderedReplies.map((c, replyIndex) => (
                      <div
                        key={c.comment_id}
                        id={`thread-${c.comment_id}`}
                        className="first:mt-2"
                      >
                        <CommentReply
                          isContributor={isContributor(c.user_id)}
                          comment={c}
                        />
                        {replyIndex < orderedReplies.length - 1 && (
                          <Separator className="mt-6 mb-8" />
                        )}
                      </div>
                    ))}
                  </CommentBox>

                  {threadIndex < group.threads.length - 1 && (
                    <Separator className="mt-8 mb-4" />
                  )}
                </div>
              );
            })}

            {isLoggedIn && newThreadFormGroup === groupIndex && (
              <div className="border-t pt-6">
                <CommentEditor
                  autoFocus
                  name={`new-inline-thread-${groupIndex}`}
                  draftKey={`comment-draft:${publicationId}:thread:${groupIndex}:${hashAnchorText(groupAnchor.anchor_text)}`}
                  placeholder="Start a new comment thread"
                  submitLabel={
                    newThreadMutation.isPending ? "Posting…" : "Submit"
                  }
                  disabled={newThreadMutation.isPending}
                  onCancel={() => setNewThreadFormGroup(null)}
                  onSubmit={(body) =>
                    new Promise<void>((resolve, reject) => {
                      newThreadMutation.mutate(
                        { body, anchor: groupAnchor },
                        {
                          onSuccess: () => resolve(),
                          onError: (e) => reject(e as Error)
                        }
                      );
                    })
                  }
                />
              </div>
            )}

            {newThreadFormGroup !== groupIndex && (
              <Button
                intent="secondary"
                className="mt-6 w-full"
                onClick={() => {
                  if (isLoggedIn) {
                    setNewThreadFormGroup(groupIndex);
                  } else {
                    authContext?.requestAuth(() =>
                      setNewThreadFormGroup(groupIndex)
                    );
                  }
                }}
              >
                New thread
              </Button>
            )}

            {groupIndex < threadsByAnchor.length - 1 && (
              <Separator className="mt-8 mb-4" />
            )}
          </div>
        );
      })}
    </InlineCommentSheetShell>
  );
}
