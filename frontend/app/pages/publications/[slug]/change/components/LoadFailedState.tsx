import Button from "@/components/stacks-ui/Button";
import useAppNavigate from "@/hooks/useAppNavigate";
import { AlertTriangle } from "lucide-react";

export default function LoadFailedState({
  description,
  error,
  onRetry,
}: {
  /** Overrides the error's own message, e.g. for a raw server error. */
  description?: string;
  error: Error | null;
  onRetry: () => void;
}) {
  const navigate = useAppNavigate();

  return (
    <div className="mx-auto flex w-full max-w-321 flex-col items-center justify-center px-4 py-24 text-center md:px-8 md:py-32">
      <AlertTriangle aria-hidden className="stroke-error-900 mb-6" size={40} />
      <h1 className="text-headline-30 text-fg-strong mb-3 font-serif">
        Couldn't load this publication
      </h1>
      <p className="text-body-30 text-fg-muted mb-8 max-w-md font-sans">
        {description ??
          error?.message ??
          "Something went wrong while loading this draft. Your changes elsewhere are safe."}
      </p>
      <div className="flex gap-3">
        <Button onClick={onRetry}>Try again</Button>
        <Button
          intent="secondary"
          onClick={() => navigate("/account/publications")}
        >
          Back to publications
        </Button>
      </div>
    </div>
  );
}
