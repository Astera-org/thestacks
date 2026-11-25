import { LoadingSpinner } from "@/components/LoadingSpinner";
import Button from "@/components/stacks-ui/Button";
import { EditPublicationStatus } from "@/hooks/use-edit-publication/types";
import { SaveDraftButton } from "./SaveDraftButton";

export default function ReleaseBar({
  hasRejected,
  isDirty,
  isPreviouslyPublished,
  isReadOnly,
  onRelease,
  onRetry,
  onSave,
  status,
}: {
  hasRejected: boolean;
  isDirty: boolean;
  isPreviouslyPublished?: boolean;
  isReadOnly?: boolean;
  onRelease: () => void;
  onRetry: () => void;
  onSave: () => void;
  status: EditPublicationStatus;
}) {
  return (
    <div className="bg-gray-blue-700 text-fg-inverted flex flex-col gap-5 rounded-xl px-5 py-5 md:flex-row md:items-center md:justify-between">
      <div>
        <h2 className="text-body-40 font-medium">
          {isPreviouslyPublished
            ? "Release a new version?"
            : "Ready to release?"}
        </h2>
        <p className="text-body-20 text-fg-inverted/70 mt-1">
          {isPreviouslyPublished
            ? "Content and detail changes ship with the next version."
            : "This will make your publication public on The Stacks."}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {status.status === "init" ? (
          <LoadingSpinner isDark size={24} />
        ) : (
          <>
            <SaveDraftButton
              hasRejected={hasRejected}
              isDirty={isDirty}
              isReadOnly={isReadOnly}
              status={status.status}
              onRetry={onRetry}
              onSave={onSave}
            />
            <Button
              disabled={
                (status.status !== "saved" && status.status !== "loaded") ||
                isReadOnly
              }
              intent="outlineInverted"
              onClick={onRelease}
            >
              {isPreviouslyPublished
                ? "Release new version…"
                : "Release publication…"}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
