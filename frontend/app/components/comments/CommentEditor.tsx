import RichTextEditor from "@/components/editor/RichTextEditor";
import Button from "@/components/stacks-ui/Button";
import { useCommentDraft } from "@/hooks/useCommentDraft";
import { cn } from "@/lib/utils";
import React, { useState } from "react";

/**
 * Removes trailing whitespace from Markdown content, including:
 * - Regular whitespace and newlines
 * - &nbsp; entities
 */
function trimMarkdownEnd(markdown: string): string {
  return markdown.replace(/(&nbsp;|\u00A0|\s)+$/g, "");
}

interface CommentEditorProps {
  autoFocus?: boolean;
  cancelLabel?: string;
  className?: string;
  collapsible?: boolean;
  disabled?: boolean;
  /** When set, the draft is persisted to sessionStorage under this key. */
  draftKey?: string;
  initialBody?: string;
  name: string;
  onSubmit: (body: string) => void | Promise<void>;
  onCancel?: () => void;
  placeholder?: string;
  submitLabel?: string;
  textAreaClassName?: string;
}

export default function CommentEditor(props: CommentEditorProps) {
  const {
    autoFocus = false,
    cancelLabel = "Cancel",
    className,
    collapsible = false,
    textAreaClassName,
    disabled = false,
    draftKey,
    initialBody = "",
    name,
    onSubmit,
    placeholder = "Leave scientific feedback or ask a question...",
    submitLabel = "Submit"
  } = props;

  // Track whether the editor is expanded (for collapsible mode).
  const [isExpanded, setIsExpanded] = useState(autoFocus);

  const [body, setBody, clearDraft] = useCommentDraft(draftKey, initialBody);

  // Sync body when initialBody changes after mount (e.g. async load for
  // editing). Adjusting state during render avoids an extra commit cycle.
  // On initial mount prevInitialBody === initialBody, so a restored draft
  // is never overwritten.
  const [prevInitialBody, setPrevInitialBody] = useState(initialBody);
  if (prevInitialBody !== initialBody) {
    setPrevInitialBody(initialBody);
    setBody(initialBody);
  }

  let { onCancel } = props;
  if (onCancel == null) {
    onCancel = () => {
      clearDraft();
      setBody(initialBody);
      if (collapsible) {
        setIsExpanded(false);
      }
    };
  }

  // Handle submit.
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    if (disabled || isSubmitting) return;

    const commentText = trimMarkdownEnd(body);
    if (commentText.length < 3) {
      setError("Comment is too short");
      return;
    }
    setError(null);
    setIsSubmitting(true);

    try {
      await onSubmit(commentText);
      setBody("");
      clearDraft();
      if (collapsible) {
        setIsExpanded(false);
      }
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to submit comment."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const showButtons = !collapsible || isExpanded;

  const actions = showButtons ? (
    <>
      <Button
        type="button"
        size="sm"
        intent="secondary"
        onClick={onCancel}
        disabled={disabled || isSubmitting}
      >
        {cancelLabel}
      </Button>
      <Button
        type="submit"
        size="sm"
        disabled={disabled || isSubmitting || trimMarkdownEnd(body).length < 3}
      >
        {isSubmitting ? `${submitLabel}…` : submitLabel}
      </Button>
    </>
  ) : undefined;

  return (
    <div className="flex w-full flex-col gap-2" data-testid="comment-editor">
      <div
        className={cn("group me-1 flex items-start gap-2 md:gap-7", className)}
      >
        <form method="post" onSubmit={handleSubmit} className="grow" noValidate>
          <RichTextEditor
            className={textAreaClassName}
            name={name}
            value={body}
            onChange={setBody}
            placeholder={placeholder}
            disabled={disabled || isSubmitting}
            autoFocus={autoFocus}
            showToolbar={!collapsible || isExpanded}
            collapsed={collapsible && !isExpanded}
            onFocus={collapsible ? () => setIsExpanded(true) : undefined}
            compactToolbar={true}
            actions={actions}
          />
          {error && (
            <p className="text-error-800 mt-2 text-sm font-medium">{error}</p>
          )}
        </form>
      </div>
    </div>
  );
}
