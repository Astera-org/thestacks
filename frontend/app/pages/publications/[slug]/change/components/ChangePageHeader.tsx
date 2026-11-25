import MarkdownRenderer from "@/components/MarkdownRenderer";
import { Skeleton } from "@/components/Skeleton";
import LinkButton from "@/components/stacks-ui/LinkButton";
import { EditPublicationStatus } from "@/hooks/use-edit-publication/types";
import { PublicationV1 } from "@/types/v1";
import { Eye } from "lucide-react";
import type { LinkedGoogleDoc } from "../linked-google-doc";
import { PublicationStatusPill } from "./PublicationStatusPill";

type ChangePageHeaderProps = {
  importDocument?: LinkedGoogleDoc | null;
  onRetry: () => void;
  publication: PublicationV1 | undefined;
  saveError: "failed" | "offline" | null;
  status: EditPublicationStatus;
  title?: string;
};

function versionLabel(publication: PublicationV1) {
  if (publication.state !== "PUBLISHED") return "Draft · not yet released";

  const liveVersion = Math.max(
    0,
    ...(publication.versions ?? [])
      .filter((v) => v.versionNumber !== publication.versionNumber)
      .map((v) => v.versionNumber ?? 0)
  );
  const live = liveVersion || publication.versionNumber - 1;
  return `Editing v${publication.versionNumber} draft · currently live: v${live}`;
}

export default function ChangePageHeader({
  importDocument,
  onRetry,
  publication,
  saveError,
  status,
  title,
}: ChangePageHeaderProps) {
  const isLoading = status.status === "init" || !publication;

  return (
    <header className="bg-pub-header">
      <div className="mx-auto w-full max-w-321 px-4 pt-10 pb-8 md:px-8 md:pt-14 md:pb-10">
        <div className="text-caption-30 text-fg bg-sky-blue-400 inline-flex min-h-8 items-center rounded-full px-4 font-mono">
          {isLoading ? (
            <Skeleton className="w-40 rounded-full" />
          ) : (
            versionLabel(publication)
          )}
        </div>

        <h1 className="text-headline-40 text-fg-strong mt-8 font-serif md:mt-12">
          {isLoading ? (
            <Skeleton className="w-3/5 rounded-md" />
          ) : (
            (title && <MarkdownRenderer markdown={title} />) || (
              <span className="text-fg-muted italic">Untitled</span>
            )
          )}
        </h1>

        <div className="mt-8 flex flex-col gap-4 md:mt-12 md:flex-row md:items-center md:justify-between">
          <div className="text-caption-20 text-fg flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 font-mono">
            <PublicationStatusPill status={status} transparent />
            {importDocument && (
              <>
                <span aria-hidden>•</span>
                <span
                  className="min-w-0 truncate"
                  title={importDocument.filename ?? importDocument.url}
                >
                  Imported
                  {importDocument.publicationVersionNumber
                    ? ` for v${importDocument.publicationVersionNumber}`
                    : ""}{" "}
                  from {importDocument.filename ?? importDocument.url}
                </span>
              </>
            )}
          </div>

          {publication && (
            <LinkButton
              className="shrink-0 gap-2"
              intent="secondary"
              rel="noopener noreferrer"
              size="sm"
              target="_blank"
              to={`/publications/${publication.slug}/draft`}
              viewTransition={false}
            >
              <Eye aria-hidden className="size-4" />
              Preview
            </LinkButton>
          )}
        </div>
      </div>

      {saveError && (
        <div
          className="bg-error-700 text-error-900 text-body-20 px-4 py-2 text-center"
          role="alert"
        >
          {saveError === "offline" ? (
            "You're offline. Your changes will save when you reconnect."
          ) : (
            <>
              Your latest changes didn't save. We'll keep retrying.{" "}
              <button
                className="font-medium underline underline-offset-4"
                type="button"
                onClick={onRetry}
              >
                Retry now
              </button>
            </>
          )}
        </div>
      )}
    </header>
  );
}
