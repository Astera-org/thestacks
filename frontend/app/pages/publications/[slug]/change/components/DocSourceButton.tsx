import { namespaceIssueMessage, ValidationIssue } from "@/api/errors";
import { ImportStatusResponse } from "@/apiv1/imports";
import GoogleDocsIcon from "@/components/icons/GoogleDocs";
import Button from "@/components/stacks-ui/Button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/stacks-ui/Popover";
import { Commit } from "@/hooks/use-edit-publication/types";
import { cn } from "@/lib/utils";
import { ChevronDown, Link, Link2, Loader2, RefreshCw, X } from "lucide-react";
import { useCallback, useState } from "react";
import type { LinkedGoogleDoc } from "../linked-google-doc";
import FieldError from "./FieldError";
import { ImportSyncedLabel } from "./ImportSyncedLabel";
import { MediaUploadStatus } from "./MediaUploadStatus";

export default function DocSourceButton({
  commit,
  disabled,
  fieldErrors,
  importDocument,
  isLoading,
  onReimport,
  onSwitch,
  uploadState,
}: {
  commit: Commit;
  disabled?: boolean;
  fieldErrors: ValidationIssue[] | null;
  importDocument: LinkedGoogleDoc | undefined | null;
  isLoading: boolean;
  /** Re-imports the doc at `url` into the draft. */
  onReimport: (url: string) => Promise<void>;
  onSwitch: () => void;
  uploadState: ImportStatusResponse | undefined;
}) {
  const [_isResyncing, setIsResyncing] = useState<boolean>(false);
  const [resyncError, setResyncError] = useState<string | null>(null);
  const [isRemovePending, setIsRemovePending] = useState<boolean>(false);
  const [open, setOpen] = useState(false);

  const isResyncing = _isResyncing || uploadState?.settled === false;

  const handleRemove = useCallback(async () => {
    try {
      setIsRemovePending(true);
      const handle = commit<"importDocument">("importDocument", null);
      const res = await handle.result;
      const outcome = res.outcomes.importDocument;
      if (
        outcome === "applied" ||
        outcome === "superseded" ||
        outcome === "no-op"
      )
        setOpen(false);
    } finally {
      setIsRemovePending(false);
    }
  }, [commit]);

  const handleResync = useCallback(async () => {
    if (!importDocument) return;
    try {
      setIsResyncing(true);
      setResyncError(null);
      await onReimport(importDocument.url);
    } catch (e) {
      setResyncError(
        e instanceof Error ? e.message : "Failed to sync document."
      );
    } finally {
      setIsResyncing(false);
    }
  }, [importDocument, onReimport]);

  if (isLoading) return null;

  const menuItemClass =
    "flex w-full items-start gap-2.5 rounded-lg p-2.5 text-left transition-colors hover:bg-gray-200 disabled:pointer-events-none disabled:opacity-50";

  return (
    <>
      {importDocument && (
        <div className="flex flex-col items-end gap-1">
          <div className="flex flex-row items-center gap-2">
            <MediaUploadStatus uploadState={uploadState} />
            <Button
              aria-busy={isResyncing}
              className="gap-2"
              disabled={disabled || isResyncing}
              intent="outline"
              size="sm"
              onClick={handleResync}
            >
              <RefreshCw
                aria-hidden
                className={cn("size-3.5", isResyncing ? "animate-spin" : "")}
              />
              {isResyncing ? "Syncing…" : "Sync"}
            </Button>
          </div>
          <FieldError announce message={resyncError} />
        </div>
      )}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            className={cn(
              "max-w-full min-w-0 gap-2",
              importDocument?.publicationVersionNumber
                ? "opacity-60 hover:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100"
                : ""
            )}
            intent="outline"
            size="sm"
          >
            {importDocument ? (
              <>
                <GoogleDocsIcon
                  aria-hidden
                  className="shrink-0"
                  height={14}
                  width={14}
                />
                <span className="truncate">
                  {importDocument.filename ?? importDocument.url}
                </span>
                <span aria-hidden className="hidden md:inline">
                  •
                </span>
                <span className="hidden shrink-0 md:inline">
                  <ImportSyncedLabel importDocument={importDocument} />
                </span>
              </>
            ) : (
              "Link a document"
            )}
            <ChevronDown aria-hidden className="size-3.5 shrink-0" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          aria-label="Linked document"
          className="w-75 p-1.5"
          variant="light"
        >
          {importDocument ? (
            <>
              <div className="flex items-start gap-2.5 p-2.5">
                <GoogleDocsIcon
                  aria-hidden
                  className="mt-0.5 shrink-0"
                  height={14}
                  width={14}
                />
                <span className="min-w-0">
                  <span className="text-body-20 text-fg-strong block font-medium break-words">
                    {importDocument.filename ?? importDocument.url}
                  </span>
                  <span className="text-caption-20 text-fg-muted block">
                    <ImportSyncedLabel
                      capitalize
                      importDocument={importDocument}
                    />
                  </span>
                </span>
              </div>
              <div className="bg-border my-1.5 h-px" />
              <a
                className={menuItemClass}
                href={importDocument.url}
                rel="noopener noreferrer"
                target="_blank"
              >
                <Link2 aria-hidden className="text-fg-muted mt-0.5 size-3.5" />
                <span>
                  <span className="text-body-20 text-fg-strong block font-medium">
                    Open in Google Docs
                  </span>
                  <span className="text-caption-20 text-fg-muted block">
                    Edit the source doc in a new tab
                  </span>
                </span>
              </a>
              <button
                className={menuItemClass}
                disabled={disabled}
                type="button"
                onClick={() => {
                  setOpen(false);
                  onSwitch();
                }}
              >
                <RefreshCw
                  aria-hidden
                  className="text-fg-muted mt-0.5 size-3.5"
                />
                <span>
                  <span className="text-body-20 text-fg-strong block font-medium">
                    Switch to a different doc…
                  </span>
                  <span className="text-caption-20 text-fg-muted block">
                    Link this pub to a new Google Doc
                  </span>
                </span>
              </button>
              <div className="bg-border my-1.5 h-px" />
              {importDocument.publicationVersionNumber ? (
                <p className="text-caption-20 text-fg-muted p-2.5">
                  {`Previous version v${importDocument.publicationVersionNumber} was synced with the above document. You can sync again or switch source documents.`}
                </p>
              ) : (
                <button
                  aria-busy={isRemovePending}
                  className={menuItemClass}
                  disabled={isRemovePending || disabled}
                  type="button"
                  onClick={handleRemove}
                >
                  {isRemovePending ? (
                    <Loader2
                      aria-hidden
                      className="text-error-900 mt-0.5 size-3.5 animate-spin"
                    />
                  ) : (
                    <X aria-hidden className="text-error-900 mt-0.5 size-3.5" />
                  )}
                  <span>
                    <span className="text-body-20 text-error-900 block font-medium">
                      Unlink doc
                    </span>
                    <span className="text-caption-20 text-fg-muted block">
                      Keep current content, stop syncing
                    </span>
                  </span>
                </button>
              )}
              <div className="px-2.5">
                <FieldError
                  message={namespaceIssueMessage(fieldErrors, "importDocument")}
                />
              </div>
            </>
          ) : (
            <button
              className={menuItemClass}
              disabled={disabled}
              type="button"
              onClick={() => {
                setOpen(false);
                onSwitch();
              }}
            >
              <Link aria-hidden className="text-fg-muted mt-0.5 size-3.5" />
              <span>
                <span className="text-body-20 text-fg-strong block font-medium">
                  Add a linked doc…
                </span>
                <span className="text-caption-20 text-fg-muted block">
                  Link this pub to a Google Doc
                </span>
              </span>
            </button>
          )}
        </PopoverContent>
      </Popover>
    </>
  );
}
