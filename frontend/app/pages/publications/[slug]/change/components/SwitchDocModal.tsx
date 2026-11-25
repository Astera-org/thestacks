import GoogleDocsIcon from "@/components/icons/GoogleDocs";
import Button from "@/components/stacks-ui/Button";
import Chip from "@/components/stacks-ui/Chip";
import Dialog from "@/components/stacks-ui/Dialog";
import { Commit } from "@/hooks/use-edit-publication/types";
import { useCallback, useId, useState } from "react";
import type { LinkedGoogleDoc } from "../linked-google-doc";
import FieldError from "./FieldError";
import FieldLabel from "./FieldLabel";
import { ImportSyncedLabel } from "./ImportSyncedLabel";
import { ModalBusyButton, ModalNote } from "./ModalParts";

export default function SwitchDocModal({
  importDocument,
  onClose,
  onCommit,
  onReimport,
  open,
}: {
  importDocument: LinkedGoogleDoc | undefined | null;
  onClose: () => void;
  onCommit: Commit;
  /** Imports the doc at `url` into the draft, replacing its content. */
  onReimport: (url: string) => Promise<void>;
  open: boolean;
}) {
  const inputId = useId();
  const errorId = useId();
  const [loading, setLoading] = useState<"remove" | "update" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [url, setUrl] = useState("");

  const updateImportDocument = useCallback(
    async (url: string) => {
      setLoading("update");
      setError(null);
      try {
        await onReimport(url);
        onClose();
      } catch (e) {
        setError(
          e instanceof Error
            ? e.message
            : "Unable to import the Google Doc. Check that the link is shared with anyone who has it, then try again."
        );
      } finally {
        setLoading(null);
      }
    },
    [onClose, onReimport]
  );

  const handleRemove = useCallback(async () => {
    setLoading("remove");
    setError(null);
    try {
      const { result } = onCommit({ importDocument: null });
      const res = await result;
      if (
        res.outcomes.importDocument === "applied" ||
        res.outcomes.importDocument === "superseded" ||
        res.outcomes.importDocument === "no-op"
      ) {
        onClose();
      } else if (res.outcomes.importDocument === "rejected") {
        setError(
          res.errors?.importDocument?.message ??
            "Unable to unlink the doc. Try again."
        );
      }
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Unable to unlink the doc. Try again."
      );
    } finally {
      setLoading(null);
    }
  }, [onClose, onCommit]);

  return (
    <Dialog
      footerEnd={
        <div className="flex flex-wrap gap-2.5">
          {/* A doc inherited from an earlier version can't be unlinked. */}
          {importDocument && !importDocument.publicationVersionNumber && (
            <ModalBusyButton
              busy={loading === "remove"}
              busyLabel="Unlinking…"
              disabled={loading !== null}
              intent="outline"
              onClick={handleRemove}
            >
              Unlink doc
            </ModalBusyButton>
          )}
          <ModalBusyButton
            busy={loading === "update"}
            busyLabel="Importing…"
            disabled={!url.trim() || loading !== null}
            onClick={() => updateImportDocument(url.trim())}
          >
            {importDocument ? "Switch doc" : "Link doc"}
          </ModalBusyButton>
        </div>
      }
      footerStart={
        <Button intent="outline" size="sm" onClick={onClose}>
          Cancel
        </Button>
      }
      kicker="Google Doc"
      open={open}
      title={
        importDocument
          ? "Link this pub to a different doc"
          : "Link this pub to a doc"
      }
      onOpenChange={(open) => {
        if (open === false) {
          onClose();
        }
      }}
    >
      {importDocument && (
        <div className="flex items-center gap-3 rounded-lg bg-gray-200 p-3.5">
          <GoogleDocsIcon
            aria-hidden
            className="shrink-0"
            height={16}
            width={16}
          />
          <span className="min-w-0 flex-grow">
            <span className="text-body-20 text-fg-strong block font-medium break-words">
              {importDocument.filename ?? importDocument.url}
            </span>
            <span className="text-caption-20 text-fg-muted block">
              <ImportSyncedLabel capitalize importDocument={importDocument} />
            </span>
          </span>
          <Chip
            className="h-fit max-w-36 flex-shrink-1 rounded-none text-right text-wrap"
            intent="muted"
            size="xs"
          >
            {importDocument.publicationVersionNumber
              ? `Previous version v${importDocument.publicationVersionNumber} linked`
              : "Linked"}
          </Chip>
        </div>
      )}

      <div>
        <FieldLabel htmlFor={inputId}>New doc URL</FieldLabel>
        <div className="border-carbon-200 hover:border-primary focus-within:border-primary bg-surface flex h-13 items-center gap-3 rounded-lg border px-4 transition-colors">
          <GoogleDocsIcon
            aria-hidden
            className="shrink-0"
            height={16}
            width={16}
          />
          <input
            aria-describedby={error ? errorId : undefined}
            aria-invalid={error ? true : undefined}
            className="text-body-30 md:text-body-20 text-fg placeholder:text-fg-muted min-w-0 flex-1 bg-transparent font-mono outline-none"
            id={inputId}
            placeholder="https://docs.google.com/document/d/…"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </div>
        <FieldError id={errorId} message={error} />
      </div>

      <ModalNote className="bg-gray-200">
        Switching replaces the title, subtitle, abstract, and body with the new
        doc&rsquo;s content, including any edits you made to those fields.
        Details, contributors, and settings are kept.
      </ModalNote>
    </Dialog>
  );
}
