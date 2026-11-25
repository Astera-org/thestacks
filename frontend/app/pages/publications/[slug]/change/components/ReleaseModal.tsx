import { ValidationIssue } from "@/api/errors";
import ArrowRightIcon from "@/components/icons/ArrowRight";
import Button from "@/components/stacks-ui/Button";
import Checkbox from "@/components/stacks-ui/Checkbox";
import Dialog from "@/components/stacks-ui/Dialog";
import Textarea from "@/components/stacks-ui/Textarea";
import { Commit } from "@/hooks/use-edit-publication/types";
import { markdownToTextSync } from "@/lib/markdown";
import { PublicationV1 } from "@/types/v1";
import { UseMutationResult } from "@tanstack/react-query";
import { useState } from "react";
import FieldError from "./FieldError";

export default function ReleaseModal({
  fieldErrors,
  note,
  onClose,
  onCommit,
  open,
  publishError,
  publishMutation,
  slug,
  title,
  versionNumber,
}: {
  fieldErrors: ValidationIssue[] | null;
  note: string | undefined | null;
  onClose: () => void;
  onCommit: Commit;
  open: boolean;
  publishError: string | null;
  publishMutation: UseMutationResult<
    PublicationV1 | undefined,
    Error,
    string | null,
    unknown
  >;
  slug: string;
  title: string;
  versionNumber: number | undefined;
}) {
  const [error, setError] = useState<boolean | null>(null);
  const [authorsConsented, setAuthorsConsented] = useState(false);
  const handleClose = () => {
    setAuthorsConsented(false);
    onClose();
  };
  const isReleaseDisabled =
    publishMutation.isPending ||
    (fieldErrors?.length ?? 0) > 0 ||
    !authorsConsented;
  const isPreviouslyPublished = versionNumber != null && versionNumber > 1;
  const kicker = isPreviouslyPublished
    ? "Releasing a new version"
    : "Releasing a new publication";
  const permanantDetailsClass = "text-body-20 text-fg-muted mt-1";
  return (
    <Dialog
      footerEnd={
        <div className="flex shrink-0 gap-2.5">
          <Button
            aria-label="Cancel"
            intent="outline"
            size="sm"
            onClick={handleClose}
          >
            Cancel
          </Button>
          <Button
            aria-busy={publishMutation.isPending}
            aria-disabled={isReleaseDisabled}
            className="whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isReleaseDisabled}
            size="sm"
            onClick={async () => {
              try {
                await publishMutation.mutateAsync(note || null);
              } catch {
                setError(true);
              }
            }}
          >
            {isPreviouslyPublished
              ? "Release new version"
              : "Release publication"}{" "}
            <ArrowRightIcon className="size-3 ps-1" />
          </Button>
        </div>
      }
      footerStart={
        <span className="text-caption-20 text-fg-muted min-w-0 font-mono">
          Publishing as{" "}
          <b className="text-carbon-800">
            {slug}/v{versionNumber ?? 1}
          </b>
          .
        </span>
      }
      kicker={kicker}
      open={open}
      title={markdownToTextSync(title)}
      onOpenChange={(open) => {
        if (open === false) {
          handleClose();
        }
      }}
    >
      <div className="rounded-lg bg-gray-200 p-3.5">
        <div className="text-headline-10 text-fg-strong font-serif">
          Have all byline authors consented to this release?
        </div>
        {isPreviouslyPublished ? (
          <div className={permanantDetailsClass}>
            Upon release, the <b>version DOI</b> will become permanent. The{" "}
            <i>concept DOI</i>, publication <i>slug</i> and <i>license</i> are
            already permanent.
          </div>
        ) : (
          <div className={permanantDetailsClass}>
            Upon release, the <b>concept and version DOIs</b>, publication{" "}
            <b>slug</b>, and <b>license</b> become permanent.
          </div>
        )}
        <div className="mt-3">
          <Checkbox
            checked={authorsConsented}
            className="mt-0.5"
            onChange={(e) => setAuthorsConsented(e.target.checked)}
          >
            <span className="text-body-20 text-fg-strong font-medium">
              I confirm that all byline authors have consented to this release.
            </span>
          </Checkbox>
        </div>
      </div>
      <Textarea
        className="resize-none"
        label="Release note"
        placeholder={
          isPreviouslyPublished
            ? "A short note describing the changes made in this version."
            : "Optional: a short note describing the first release."
        }
        value={note ?? ""}
        onChange={(e) => onCommit("versionDesc", e.target.value)}
      />
      <div>
        {error &&
          (!(fieldErrors && fieldErrors.length > 0) || publishError) && (
            <div className="my-2 rounded-lg bg-gray-200 p-3.5">
              <span className="text-caption-20 text-fg-muted font-mono uppercase">
                Error
              </span>
              {publishError && <FieldError announce message={publishError} />}
              {!(fieldErrors && fieldErrors.length > 0) && (
                <FieldError
                  announce
                  message="Unable to release the publication. Try again."
                />
              )}
            </div>
          )}
        {fieldErrors && fieldErrors.length > 0 && (
          <div className="my-2 rounded-lg bg-gray-200 p-3.5">
            <span className="text-caption-20 text-fg-muted font-mono uppercase">
              Validation errors
            </span>
            <div className="text-body-20 text-fg mt-1">
              Fix the following before releasing:
            </div>

            <div className="mt-2">
              {fieldErrors.map((error, index) => (
                <FieldError key={index} message={error.message} />
              ))}
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
}
