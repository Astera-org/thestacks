import { createComment, updateComment, withdrawComment } from "@/api/comments";
import { CommentAuthContext } from "@/components/comments/CommentAuthProvider";
import CommentEditor from "@/components/comments/CommentEditor";
import Link from "@/components/Link";
import MystRenderer from "@/components/MystRenderer";
import Avatar from "@/components/stacks-ui/Avatar";
import {
  Dropdown,
  DropdownContent,
  DropdownItem,
  DropdownTrigger
} from "@/components/stacks-ui/Dropdown";
import Tooltip from "@/components/stacks-ui/Tooltip";
import { TimeFromNow } from "@/components/TimeFromNow";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { useCommentVersions } from "@/hooks/useCommentVersions";
import {
  useLinkedCommentFlash,
  useLinkedCommentId
} from "@/hooks/useLinkedCommentId";
import { useRevealCommentAnchor } from "@/hooks/useRevealCommentAnchor";
import { commentIdToHash } from "@/lib/commentNavigation";
import {
  EDIT_WINDOW_WARNING_MS,
  formatTimeRemaining,
  formatTimeRemainingShort,
  getCommentEditability
} from "@/lib/comments/editability";
import { cn, formatDate } from "@/lib/utils";
import { Comment } from "@/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import DOMPurify from "dompurify";
import {
  AlertCircle,
  ChevronDown,
  CircleMinus,
  Clock,
  Copy,
  Info,
  Lock,
  MoreVertical,
  Pencil
} from "lucide-react";
import {
  memo,
  use,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState
} from "react";
import { useLocation } from "react-router";
import { toast } from "sonner";
type User = ReturnType<typeof useAuth>["user"];

const MemoizedMystRenderer = memo(MystRenderer);

/** Tick only the small controls that depend on the remaining edit window. */
function useCommentEditability(
  comment: Comment,
  hasReplies: boolean,
  isAuthor: boolean
) {
  const [, setNow] = useState(() => Date.now());
  const editability = isAuthor
    ? getCommentEditability(comment, hasReplies)
    : null;
  const canEdit = comment.state !== "WITHDRAWN" && !!editability?.canEdit;

  useEffect(() => {
    if (!canEdit) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [canEdit]);

  return editability;
}

function CommentEditCountdown({
  comment,
  hasReplies
}: {
  comment: Comment;
  hasReplies: boolean;
}) {
  const editability = useCommentEditability(comment, hasReplies, true);
  if (!editability?.canEdit) return null;

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg px-3 py-2 text-sm",
        editability.timeRemaining < EDIT_WINDOW_WARNING_MS
          ? "bg-butter-yellow-100 text-butter-yellow-800"
          : "text-fg-muted bg-gray-100"
      )}
    >
      <Clock className="size-4 shrink-0" />
      <span>
        Editable for{" "}
        <strong>{formatTimeRemaining(editability.timeRemaining)}</strong>
      </span>
    </div>
  );
}

/**
 * Extract the formatted innerHTML from all DOM anchor wrappers for a comment.
 * Creates a range spanning every wrapper, clones the contents, then strips
 * the wrapper spans and any `<a>` tags (to avoid nested interactivity)
 * while preserving formatting elements like `<em>` and `<sup>`.
 */
function extractFormattedAnchorHtml(commentId: number): string | null {
  const wrappers = document.querySelectorAll<HTMLElement>(
    `.comment-anchor-wrapper[data-comment-ids~="${commentId}"]`
  );
  if (wrappers.length === 0) return null;

  const range = document.createRange();
  range.setStartBefore(wrappers[0]);
  range.setEndAfter(wrappers[wrappers.length - 1]);

  const fragment = range.cloneContents();
  const container = document.createElement("div");
  container.appendChild(fragment);

  // Drop the MathML accessibility duplicate; its annotation text would
  // otherwise leak into the preview once the wrapping <math> tags are
  // stripped by the sanitizer below.
  container.querySelectorAll(".katex-mathml").forEach((el) => el.remove());

  container.querySelectorAll(".comment-anchor-wrapper, a").forEach((el) => {
    const parent = el.parentNode;
    if (!parent) return;
    while (el.firstChild) parent.insertBefore(el.firstChild, el);
    parent.removeChild(el);
  });

  const raw = container.innerHTML || null;
  if (!raw) return null;
  // Keep `style`: KaTeX positions every vlist row, strut, and sub/superscript
  // with inline styles, so stripping them makes characters float off the
  // baseline. Mirrors the selection-time sanitizer in useInlineCommentSelection.
  return DOMPurify.sanitize(raw, {
    ALLOWED_TAGS: ["em", "strong", "sup", "sub", "span", "br", "code"],
    ALLOWED_ATTR: ["class", "style", "aria-hidden"]
  });
}

/**
 * Renders anchor text for an inline comment blockquote. When the comment's
 * DOM anchor wrappers exist, extracts their formatted HTML (preserving
 * italics, superscript citations, etc.). Falls back to the stored plain
 * text with citation-spacing artifacts cleaned up.
 *
 * When the anchor originates from a code block (`isCode` prop for new
 * comments, or detected from DOM ancestry for existing ones), the content
 * is wrapped in a `<code>` element so the blockquote preserves monospace
 * styling.
 */
export function AnchorTextContent({
  text,
  commentId,
  isCode: isCodeProp,
  html: htmlProp
}: {
  text: string;
  commentId?: number;
  isCode?: boolean;
  /** Pre-extracted sanitized HTML (used for new comments before an anchor wrapper exists in the DOM). */
  html?: string | null;
}) {
  const [html, setHtml] = useState<string | null>(null);
  const [detectedCode, setDetectedCode] = useState(false);

  useEffect(() => {
    if (commentId == null) return;

    const extract = () => {
      setHtml(extractFormattedAnchorHtml(commentId));

      const wrapper = document.querySelector(
        `.comment-anchor-wrapper[data-comment-ids~="${commentId}"]`
      );
      setDetectedCode(wrapper?.closest("pre, code") != null);
    };
    extract();

    window.addEventListener("stacks-anchors-updated", extract);
    return () => window.removeEventListener("stacks-anchors-updated", extract);
  }, [commentId]);

  const useCodeStyle = isCodeProp ?? detectedCode;

  const resolvedHtml = html || htmlProp;

  const content = resolvedHtml ? (
    <span dangerouslySetInnerHTML={{ __html: resolvedHtml }} />
  ) : (
    <>{text.replace(/\s+([.,;:!?])/g, "$1")}</>
  );

  if (useCodeStyle) {
    return <code>{content}</code>;
  }
  return content;
}

/**
 * Displays the quoted anchor text of an inline comment. Clicking it scrolls the corresponding highlight into view.
 */
export function CommentAnchorText({ comment }: { comment: Comment }) {
  const revealAnchor = useRevealCommentAnchor();
  if (comment.anchor_text == null) return null;

  const handleClick = () => void revealAnchor(comment.comment_id);

  return (
    <button
      type="button"
      onClick={handleClick}
      className="inline-comment-anchor-text"
      data-testid={`comment-anchor-text-${comment.comment_id}`}
    >
      <blockquote>
        <span className="bg-selection">
          &ldquo;
          <AnchorTextContent
            text={comment.anchor_text}
            commentId={comment.comment_id}
          />
          &rdquo;
        </span>
      </blockquote>
    </button>
  );
}

interface CommentBoxProps {
  comment: Comment;
  children?: React.ReactNode;
  className?: string;
  isContributor: boolean;
  isReplyInputShown: boolean;
  onWithdrawn?: () => void;
  onShowReplyInput: (id: number | null) => void;
  replyingToCommentId: number | null;
  replies?: Comment[];
}

function useCommentMutations(publicationId: number, onWithdrawn?: () => void) {
  const queryClient = useQueryClient();

  const editMutation = useMutation({
    mutationFn: (vars: { id: number; body: string }) =>
      updateComment(vars.id, { body: vars.body }),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ["comments", publicationId]
      })
  });

  const withdrawMutation = useMutation({
    mutationFn: (id: number) => withdrawComment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["comments", publicationId]
      });
      onWithdrawn?.();
    }
  });

  const [editId, setEditId] = useState<number | null>(null);
  const [withdrawId, setWithdrawId] = useState<number | null>(null);

  return {
    editMutation,
    withdrawMutation,
    editId,
    setEditId,
    withdrawId,
    setWithdrawId
  };
}

interface CommentBodyProps {
  comment: Comment;
  editMutation: ReturnType<
    typeof useMutation<
      { comment_id: number },
      unknown,
      {
        id: number;
        body: string;
      },
      unknown
    >
  >;
  isEditing: boolean;
  setEditId: (id: number | null) => void;
}

/**
 * Renders the comment content, switching between an inline editor (when editing)
 * and the rendered MyST body (when not editing).
 */
function CommentBody(props: CommentBodyProps) {
  const { comment, editMutation, isEditing, setEditId } = props;

  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  const handleBodyClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const img = (e.target as HTMLElement).closest("img");
    if (img?.src) {
      e.preventDefault();
      setLightboxSrc(img.src);
    }
  }, []);

  if (isEditing) {
    return (
      <div key={comment.comment_id} className="mt-2">
        <CommentEditor
          initialBody={comment.body}
          name={`edit-comment-${comment.comment_id}`}
          submitLabel={editMutation.isPending ? "Saving" : "Save"}
          disabled={editMutation.isPending}
          onCancel={() => setEditId(null)}
          onSubmit={(body) =>
            new Promise<void>((resolve, reject) => {
              editMutation.mutate(
                { id: comment.comment_id, body },
                {
                  onSuccess: () => {
                    setEditId(null);
                    resolve();
                  },
                  onError: (e) => reject(e)
                }
              );
            })
          }
        />
      </div>
    );
  }

  return (
    <>
      <div>
        <div className="comment-body text-fg-strong" onClick={handleBodyClick}>
          <MemoizedMystRenderer myst={comment.body} normalizeTiptapLists />
        </div>
      </div>

      <Dialog
        open={!!lightboxSrc}
        onOpenChange={(open) => !open && setLightboxSrc(null)}
      >
        <DialogContent className="bg-surface z-500 max-w-fit rounded-lg border-none p-0 shadow-none">
          <DialogTitle className="sr-only">Image preview</DialogTitle>
          {lightboxSrc && (
            <img
              src={lightboxSrc}
              alt=""
              className="max-h-[85svh] max-w-[95vw] object-contain p-8"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

interface CommentHeaderProps {
  comment: Comment;
  hasReplies: boolean;
  isContributor: boolean;
  setEditId: (id: number | null) => void;
  setWithdrawId: (id: number | null) => void;
  user?: User;
}

/**
 * Displays the author avatar, name, relative timestamp, an optional version badge, and the action menu.
 */
function CommentHeader(props: CommentHeaderProps) {
  const { comment, hasReplies, isContributor, setEditId, setWithdrawId, user } =
    props;

  const canWithdraw = user?.id != null && user.id === comment.user_id;

  const commentCreatedAt = formatDate(comment.created_at);

  // Extract "/publications/<slug>" so version-badge links work regardless of nested routes.
  const { pathname } = useLocation();
  const basePublicationUrl = pathname.split("/").slice(0, 3).join("/");

  // Show a version badge only when the comment targets a *different* version
  // than the publication's current version, so readers know the context may differ.
  const { currentVersionId, versionMap } = useCommentVersions();
  const commentVersionNumber =
    comment.version_id != null ? versionMap.get(comment.version_id) : null;
  const showVersionBadge =
    comment.version_id != null &&
    currentVersionId != null &&
    comment.version_id !== currentVersionId &&
    commentVersionNumber != null;

  return (
    <div className="flex items-start justify-between">
      <div className="flex items-start gap-3">
        {/* Avatar, name, and date all link to the author's profile. */}
        <Link
          to={`/users/${comment.user_id}`}
          className="flex min-w-0 items-center gap-3 no-underline"
        >
          <Avatar
            src={comment.avatar}
            alt={`${comment.first_name} ${comment.last_name}`}
            className="size-9"
          />

          <div className="flex min-w-0 flex-col gap-0">
            {/* Author name. */}
            <span
              className={cn(
                "text-body-20 font-semibold",
                user && user.id === comment.user_id
                  ? "text-periwinkle-900"
                  : "text-fg-strong"
              )}
            >
              {comment.first_name} {comment.last_name}
            </span>

            {/* Relative timestamp. */}
            <span
              className="text-fg-muted text-body-20"
              title={commentCreatedAt}
            >
              <TimeFromNow date={comment.created_at} />
            </span>
          </div>
        </Link>

        {/* Version badge links to the version the comment was made on. Kept
            outside the author link since anchors cannot nest. */}
        {showVersionBadge && (
          <Tooltip
            label={`Comment made on version ${commentVersionNumber} of this publication`}
          >
            <Link
              to={`${basePublicationUrl}/v${commentVersionNumber}#${commentIdToHash(comment.comment_id)}`}
              className="text-fg-muted text-body-20 shrink-0 cursor-pointer"
              replace={true}
            >
              v{commentVersionNumber}
            </Link>
          </Tooltip>
        )}

        {/* Contributor tag, beside the avatar/name/date block. */}
        {isContributor && (
          <span className="bg-gray-blue-100 text-fg-strong text-caption-10 inline-flex h-5 items-center truncate rounded-sm px-2 font-medium">
            Contributor
          </span>
        )}
      </div>

      <CommentActionButtonGroup
        canWithdraw={canWithdraw}
        hasReplies={hasReplies}
        comment={comment}
        setEditId={setEditId}
        setWithdrawId={setWithdrawId}
      />
    </div>
  );
}

interface WithdrawConfirmationDialogProps {
  isOpen: boolean;
  isPending: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

function WithdrawConfirmationDialog(props: WithdrawConfirmationDialogProps) {
  const { isOpen, isPending, onClose, onConfirm } = props;
  const [input, setInput] = useState("");
  const inputId = useId();
  const instructionsId = `${inputId}-instructions`;

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          setInput("");
          onClose();
        }
      }}
    >
      <DialogContent className="z-500 gap-0 overflow-hidden rounded-3xl! border-none p-0 sm:max-w-md [&>button]:hidden">
        <div className="bg-gray-blue-900 flex gap-4 p-8">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/10">
            <AlertCircle className="text-fg-inverted/70 size-4" />
          </div>
          <div className="flex flex-col gap-2">
            <DialogTitle className="text-headline-20 text-fg-inverted font-serif font-normal">
              Withdraw this comment?
            </DialogTitle>
            <DialogDescription className="text-body-20 text-fg-inverted/60">
              This action cannot be undone. The comment will be replaced with a
              withdrawal notice visible to all readers.
            </DialogDescription>
          </div>
        </div>

        <div className="flex flex-col gap-4 bg-gray-200 p-8">
          <p id={instructionsId} className="text-body-20 text-gray-blue-400">
            To confirm, type{" "}
            <code className="text-fg-strong rounded bg-gray-300 px-1.5 py-0.5 font-mono text-xs">
              WITHDRAW
            </code>{" "}
            in the field below.
          </p>
          <div className="flex flex-col gap-2">
            <label htmlFor={inputId} className="text-body-20 text-fg-strong">
              Withdrawal confirmation
            </label>
            <input
              id={inputId}
              aria-describedby={instructionsId}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type WITHDRAW to confirm"
              className="text-caption-40 focus:ring-gray-blue-400 rounded-lg bg-gray-700 px-3 py-2 font-mono ring-1 ring-gray-800 outline-none focus:ring-2"
            />
          </div>
          <div className="flex justify-end gap-3">
            <DialogClose asChild>
              <button
                type="button"
                disabled={isPending}
                className="text-fg-strong border-primary text-caption-40 rounded-full border bg-transparent px-4 py-2 font-mono transition-colors disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
            </DialogClose>
            <button
              type="button"
              onClick={onConfirm}
              disabled={input !== "WITHDRAW" || isPending}
              className={cn(
                "text-caption-40 rounded-full px-6 py-2 font-mono transition-colors disabled:cursor-not-allowed",
                input !== "WITHDRAW"
                  ? "bg-gray-blue-100 text-gray-blue-300"
                  : "bg-gray-blue-800 hover:bg-gray-blue-700 text-fg-inverted"
              )}
            >
              {isPending ? "Withdrawing..." : "Withdraw comment"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface WithdrawnCommentDisplayProps {
  comment: Comment;
  isContributor: boolean;
}

function WithdrawnCommentDisplay(props: WithdrawnCommentDisplayProps) {
  const { comment, isContributor } = props;
  const commentCreatedAt = formatDate(comment.created_at);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <div className="flex min-w-0 flex-col gap-0">
          <span className="text-body-20 text-fg-strong font-semibold">
            {comment.first_name} {comment.last_name}
          </span>
          <span className="text-fg-muted text-body-20" title={commentCreatedAt}>
            <TimeFromNow date={comment.created_at} />
          </span>
        </div>
        {isContributor && (
          <span className="bg-gray-blue-100 text-fg-strong text-caption-10 inline-flex h-5 items-center truncate rounded-sm px-2 font-medium">
            Contributor
          </span>
        )}
      </div>
      <div className="bg-surface-sunken text-fg-muted text-caption-40 flex min-h-[52px] items-center gap-2 rounded-lg px-4 py-3">
        <Info className="size-4 shrink-0" />
        <span className="italic">Comment has been withdrawn by the author</span>
      </div>
    </div>
  );
}

interface CommentActionButtonGroupProps {
  canWithdraw: boolean;
  hasReplies: boolean;
  comment: Comment;
  setEditId: (id: number | null) => void;
  setWithdrawId: (id: number | null) => void;
}

/**
 * Three-dot dropdown menu with "Copy link", "Edit", and "Withdraw" actions (permission-gated).
 */
function CommentActionButtonGroup(props: CommentActionButtonGroupProps) {
  const { canWithdraw, hasReplies, comment, setEditId, setWithdrawId } = props;
  const editability = useCommentEditability(comment, hasReplies, canWithdraw);

  const handleCopyLink = () => {
    const link = `${window.location.href.split("#")[0]}#${commentIdToHash(comment.comment_id)}`;
    toast.promise(navigator.clipboard.writeText(link), {
      loading: "Copying...",
      success: "Copied to clipboard!",
      error: "Could not copy to clipboard."
    });
  };

  const isWarning =
    editability?.canEdit && editability.timeRemaining! < 300_000;

  return (
    <div className="mt-2 flex grow items-center justify-end">
      <Dropdown modal={false}>
        <DropdownTrigger
          data-testid="comment-menu-button"
          aria-label="Comment actions"
          className="text-fg-subtle group flex items-center justify-between px-2 font-sans leading-4"
        >
          <MoreVertical className="text-fg size-5" />
        </DropdownTrigger>
        <DropdownContent align="end">
          <DropdownItem onClick={handleCopyLink}>
            <Copy className="size-4" />
            Copy link
          </DropdownItem>
          {editability?.canEdit && (
            <DropdownItem onClick={() => setEditId(comment.comment_id)}>
              <Pencil className="size-4" />
              Edit
              <span
                className={cn(
                  "ml-auto font-mono text-xs",
                  isWarning ? "text-butter-yellow-600" : "text-fg-inverted/40"
                )}
              >
                {formatTimeRemainingShort(editability.timeRemaining!)}
              </span>
            </DropdownItem>
          )}
          {editability && !editability.canEdit && (
            <>
              <DropdownItem disabled className="cursor-not-allowed opacity-40">
                <Pencil className="size-4" />
                Edit
                <Lock className="ml-auto size-4" />
              </DropdownItem>
              <div className="bg-gray-blue-800 text-caption-10 text-fg-inverted/50 mt-1 flex max-w-44 items-start gap-2 rounded-lg px-3 py-2">
                <Clock className="mt-0.5 size-3.5 shrink-0" />
                <span>
                  {editability.reason === "has_replies"
                    ? "Cannot edit after replies have been posted."
                    : "The 1-hour edit window for this comment has closed."}
                </span>
              </div>
            </>
          )}
          {canWithdraw && (
            <DropdownItem onClick={() => setWithdrawId(comment.comment_id)}>
              <CircleMinus className="size-4" />
              Withdraw
            </DropdownItem>
          )}
        </DropdownContent>
      </Dropdown>
    </div>
  );
}

interface CommentReplyProps {
  comment: Comment;
  className?: string;
  isContributor: boolean;
  onWithdrawn?: () => void;
}

/**
 * Reply variant of a comment card. Renders header + body with a left border,
 * but no anchor text, reply controls, or nested children.
 */
export function CommentReply(props: CommentReplyProps) {
  const { comment, className, isContributor, onWithdrawn } = props;
  const { user } = useAuth();
  const {
    editMutation,
    withdrawMutation,
    editId,
    setEditId,
    withdrawId,
    setWithdrawId
  } = useCommentMutations(comment.publication_id, onWithdrawn);

  const isEditing = editId === comment.comment_id;
  const {
    ref: linkedRef,
    isLinked,
    flash
  } = useLinkedCommentFlash(comment.comment_id);

  return (
    <div
      className={cn("mb-4 flex flex-col gap-2", className)}
      data-comment-id={comment.comment_id}
    >
      <div
        ref={linkedRef}
        className={cn(
          "flex flex-col gap-2 border-s-3 border-gray-700 ps-6",
          flash && "linked-comment"
        )}
        aria-current={isLinked ? "location" : undefined}
      >
        {comment.state === "WITHDRAWN" ? (
          <WithdrawnCommentDisplay
            comment={comment}
            isContributor={isContributor}
          />
        ) : (
          <>
            <CommentHeader
              comment={comment}
              hasReplies={false}
              isContributor={isContributor}
              setEditId={setEditId}
              setWithdrawId={setWithdrawId}
              user={user}
            />

            <CommentBody
              comment={comment}
              editMutation={editMutation}
              isEditing={isEditing}
              setEditId={setEditId}
            />
          </>
        )}
      </div>

      <WithdrawConfirmationDialog
        isOpen={withdrawId === comment.comment_id}
        isPending={withdrawMutation.isPending}
        onClose={() => setWithdrawId(null)}
        onConfirm={() => {
          if (withdrawId !== null) {
            withdrawMutation.mutate(withdrawId, {
              onSuccess: () => setWithdrawId(null)
            });
          }
        }}
      />
    </div>
  );
}

/**
 * Root comment card used in both the general comments section and inline
 * comment threads. Handles display, editing, deletion, and threaded replies
 * with a collapsible reply list. Anchor text is composed by callers via
 * the exported CommentAnchorText component.
 */
export default function CommentBox(props: CommentBoxProps) {
  const {
    children,
    className,
    comment,
    isContributor,
    isReplyInputShown,
    onWithdrawn,
    onShowReplyInput,
    replyingToCommentId,
    replies
  } = props;

  const { user } = useAuth();
  const authContext = use(CommentAuthContext);
  const {
    editMutation,
    withdrawMutation,
    editId,
    setEditId,
    withdrawId,
    setWithdrawId
  } = useCommentMutations(comment.publication_id, onWithdrawn);

  const queryClient = useQueryClient();
  const addMutation = useMutation({
    mutationFn: (payload: { body: string; parent_id?: number | null }) =>
      createComment(comment.publication_id, payload),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ["comments", comment.publication_id]
      })
  });

  const linkedCommentId = useLinkedCommentId();
  const {
    ref: linkedRef,
    isLinked,
    flash
  } = useLinkedCommentFlash(comment.comment_id);
  const isThreadLinked =
    isLinked ||
    (replies?.some((r) => r.comment_id === linkedCommentId) ?? false);

  // Deep-linked threads open so the target isn't hidden behind the reply count;
  // once the reader toggles, their choice wins.
  const [expandedOverride, setExpandedOverride] = useState<boolean | null>(
    null
  );
  const repliesExpanded = expandedOverride ?? isThreadLinked;

  const replyCount = replies?.length ?? 0;

  const canUserEdit = user?.id != null && user?.id === comment.user_id;

  // Up to 3 distinct reply authors whose avatars are shown in the collapsed reply summary.
  const uniqueReplyAuthors = useMemo(() => {
    if (!replies || replies.length === 0) return [];
    const seen = new Set<number>();
    return replies
      .filter((r) => {
        if (r.state === "WITHDRAWN") return false;
        if (seen.has(r.user_id)) return false;
        seen.add(r.user_id);
        return true;
      })
      .slice(0, 3);
  }, [replies]);

  const onSubmitReply = useCallback(
    (body: string) => {
      return new Promise<void>((resolve, reject) => {
        addMutation.mutate(
          { body, parent_id: replyingToCommentId },
          {
            onSuccess: () => {
              onShowReplyInput(null);
              resolve();
            },
            onError: (e) => reject(e)
          }
        );
      });
    },
    [addMutation, onShowReplyInput, replyingToCommentId]
  );

  const replyEditorRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (isReplyInputShown) {
      replyEditorRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center"
      });
    }
  }, [isReplyInputShown]);

  const isEditing = editId === comment.comment_id;
  const canReply = user != null;
  const showReplyButton = canReply || authContext != null;

  const handleReplyClick = useCallback(() => {
    if (!canReply && authContext) {
      authContext.requestAuth(() => onShowReplyInput(replyingToCommentId));
      return;
    }
    if (isReplyInputShown) {
      onShowReplyInput(null);
      return;
    }
    if (replyCount > 0) setExpandedOverride(true);
    onShowReplyInput(replyingToCommentId);
  }, [
    authContext,
    canReply,
    isReplyInputShown,
    replyCount,
    onShowReplyInput,
    replyingToCommentId
  ]);

  return (
    <div className={cn("mb-4 flex flex-col gap-2", className)}>
      <div
        ref={linkedRef}
        className={cn("flex flex-col gap-2", flash && "linked-comment")}
        aria-current={isLinked ? "location" : undefined}
      >
        {comment.state === "WITHDRAWN" ? (
          <WithdrawnCommentDisplay
            comment={comment}
            isContributor={isContributor}
          />
        ) : (
          <>
            <CommentHeader
              comment={comment}
              hasReplies={replyCount > 0}
              isContributor={isContributor}
              setEditId={setEditId}
              setWithdrawId={setWithdrawId}
              user={user}
            />

            <CommentBody
              comment={comment}
              editMutation={editMutation}
              isEditing={isEditing}
              setEditId={setEditId}
            />

            {canUserEdit && (
              <CommentEditCountdown
                comment={comment}
                hasReplies={replyCount > 0}
              />
            )}
          </>
        )}
      </div>

      <WithdrawConfirmationDialog
        isOpen={withdrawId === comment.comment_id}
        isPending={withdrawMutation.isPending}
        onClose={() => setWithdrawId(null)}
        onConfirm={() => {
          if (withdrawId !== null) {
            withdrawMutation.mutate(withdrawId, {
              onSuccess: () => setWithdrawId(null)
            });
          }
        }}
      />

      {(replyCount > 0 || showReplyButton) && (
        <div className="flex items-center gap-4">
          {replyCount > 0 && (
            <button
              type="button"
              onClick={() => setExpandedOverride(!repliesExpanded)}
              className="text-fg-muted hover:text-fg text-body-30 flex items-center gap-3 transition-colors"
              data-testid="toggle-replies-button"
            >
              <div className="flex -space-x-2">
                {uniqueReplyAuthors.map((r) => (
                  <Avatar
                    key={r.user_id}
                    src={r.avatar}
                    alt={`${r.first_name} ${r.last_name}`}
                    className="size-6 ring-2 ring-white"
                  />
                ))}
              </div>
              <div className="flex items-center gap-1">
                {replyCount} {replyCount === 1 ? "reply" : "replies"}
                <ChevronDown
                  size={16}
                  className={cn(
                    "transition-transform",
                    repliesExpanded && "rotate-180"
                  )}
                />
              </div>
            </button>
          )}
          {showReplyButton && (
            <button
              type="button"
              className="hover:text-fg/75 text-body-30 font-medium underline underline-offset-4"
              onClick={handleReplyClick}
            >
              Reply
            </button>
          )}
        </div>
      )}

      {repliesExpanded && replyCount > 0 && children && (
        <div className="comment-thread-replies">
          {children}
          {showReplyButton && !isReplyInputShown && (
            <button
              type="button"
              className="hover:text-fg/75 text-body-30 font-medium underline underline-offset-4"
              onClick={handleReplyClick}
            >
              Reply to thread
            </button>
          )}
        </div>
      )}

      {canReply && isReplyInputShown && (
        <div ref={replyEditorRef}>
          <CommentEditor
            placeholder="Reply to this thread"
            name={`reply-to-${replyingToCommentId}`}
            draftKey={`comment-draft:${comment.publication_id}:reply:${replyingToCommentId}`}
            submitLabel={addMutation.isPending ? "Submitting" : "Submit"}
            disabled={addMutation.isPending}
            onCancel={() => onShowReplyInput(null)}
            onSubmit={onSubmitReply}
            className={cn(replyCount === 0 && "mt-4")}
          />
        </div>
      )}
    </div>
  );
}
