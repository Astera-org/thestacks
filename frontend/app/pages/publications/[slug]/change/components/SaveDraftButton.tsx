import { LoadingSpinner } from "@/components/LoadingSpinner";
import Button from "@/components/stacks-ui/Button";
import { SaveStatus } from "@/hooks/use-edit-publication/types";
import { AlertTriangle, Check } from "lucide-react";
import { useEffect, useEffectEvent, useState } from "react";

export const CONFIRMATION_MS = 2000;

type ConfirmationKind = "saved" | "upToDate" | "needsFixing";

const CONFIRMATION_LABELS: Record<ConfirmationKind, string> = {
  saved: "Saved",
  upToDate: "Up to date",
  needsFixing: "Check field errors",
};

/**
 * Saves the draft on click or Cmd/Ctrl+S. Autosave keeps running regardless;
 * this only skips the debounce, and confirms when there was nothing to send.
 */
export function SaveDraftButton({
  hasRejected,
  isDirty,
  isReadOnly,
  onRetry,
  onSave,
  status,
}: {
  hasRejected: boolean;
  isDirty: boolean;
  isReadOnly?: boolean;
  onRetry: () => void;
  onSave: () => void;
  status: SaveStatus;
}) {
  const [awaitingSave, setAwaitingSave] = useState(false);
  // An object, so a repeat click restarts the timer even for the same kind.
  const [confirmation, setConfirmation] = useState<{
    kind: ConfirmationKind;
  } | null>(null);

  const isFailed = status === "error" || status === "conflict";
  const isOffline = status === "offline";

  if (awaitingSave && (isFailed || isOffline)) {
    setAwaitingSave(false);
  } else if (awaitingSave && !isDirty) {
    setAwaitingSave(false);
    setConfirmation({ kind: hasRejected ? "needsFixing" : "saved" });
  }

  useEffect(() => {
    if (!confirmation) return;
    const id = setTimeout(() => setConfirmation(null), CONFIRMATION_MS);
    return () => clearTimeout(id);
  }, [confirmation]);

  const save = () => {
    if (isReadOnly || isOffline) return;
    if (isFailed) {
      setAwaitingSave(true);
      onRetry();
      return;
    }
    if (isDirty) {
      setConfirmation(null);
      setAwaitingSave(true);
      onSave();
      return;
    }
    setConfirmation({ kind: hasRejected ? "needsFixing" : "upToDate" });
  };

  const onShortcut = useEffectEvent((event: KeyboardEvent) => {
    const isSaveShortcut =
      event.key.toLowerCase() === "s" &&
      (event.metaKey || event.ctrlKey) &&
      !event.altKey &&
      !event.shiftKey;
    if (!isSaveShortcut) return;
    // Always suppress the browser's "Save page" dialog on the editor.
    event.preventDefault();
    save();
  });

  useEffect(() => {
    window.addEventListener("keydown", onShortcut);
    return () => window.removeEventListener("keydown", onShortcut);
  }, []);

  const announcement = confirmation
    ? CONFIRMATION_LABELS[confirmation.kind]
    : isFailed
      ? "Saving failed"
      : "";

  return (
    <>
      <Button
        aria-busy={awaitingSave}
        aria-keyshortcuts="Meta+S Control+S"
        className="min-w-32 gap-1.5"
        disabled={isReadOnly}
        intent="outlineInverted"
        onClick={save}
      >
        {confirmation ? (
          <>
            {confirmation.kind === "needsFixing" ? (
              <AlertTriangle aria-hidden size={14} />
            ) : (
              <Check aria-hidden size={14} />
            )}
            {CONFIRMATION_LABELS[confirmation.kind]}
          </>
        ) : awaitingSave ? (
          <>
            <span aria-hidden>
              <LoadingSpinner isDark size={12} />
            </span>
            Saving…
          </>
        ) : isFailed ? (
          "Retry save"
        ) : isOffline ? (
          "Waiting for connection"
        ) : (
          "Save draft"
        )}
      </Button>
      <span aria-live="polite" className="sr-only">
        {announcement}
      </span>
    </>
  );
}
