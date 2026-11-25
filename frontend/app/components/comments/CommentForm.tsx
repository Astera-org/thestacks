import { createComment } from "@/api/comments";
import CommentEditor from "@/components/comments/CommentEditor";
import CommentLogInNotice from "@/components/comments/CommentLogInNotice";
import { useAuth } from "@/hooks/useAuth";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";

interface CommentFormProps {
  publicationId: number;
  parentId?: number | null;
  onSuccess?: (result: { comment_id: number }) => void;
  className?: string;
}

export default function CommentForm(props: CommentFormProps) {
  const { publicationId, parentId = null, onSuccess, className } = props;
  const { user } = useAuth();

  // Prevent hydration mismatch by only rendering after mount
  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHasMounted(true);
  }, []);

  const mutation = useMutation({
    mutationFn: (body: string) =>
      createComment(publicationId, { body, parent_id: parentId }),
    onSuccess: (comment) => {
      onSuccess?.(comment);
    }
  });

  // Render nothing on the server to avoid hydration mismatch
  if (!hasMounted) {
    return null;
  }

  if (!user) {
    return <CommentLogInNotice />;
  }

  return (
    <div data-testid="new-comment-form">
      <CommentEditor
        name="new-comment"
        draftKey={`comment-draft:${publicationId}:top-level`}
        className={className}
        textAreaClassName="min-h-7 md:min-h-16"
        placeholder="Leave scientific feedback or ask a question..."
        submitLabel={mutation.isPending ? "Submitting" : "Submit"}
        disabled={mutation.isPending}
        collapsible={true}
        onSubmit={(body) =>
          new Promise<void>((resolve, reject) => {
            mutation.mutate(body, {
              onSuccess: () => resolve(),
              onError: (e) => reject(e)
            });
          })
        }
      />
      {mutation.isError && (
        <p className="form-error">
          {(mutation.error as Error)?.message || "Failed to post comment"}
        </p>
      )}
    </div>
  );
}
