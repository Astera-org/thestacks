import Button from "@/components/stacks-ui/Button";
import Dialog from "@/components/stacks-ui/Dialog";
import { useId, useState } from "react";
import DoiInput, { doiSaveErrorMessage, doiSuffix } from "./DoiInput";
import FieldLabel from "./FieldLabel";
import { ModalBusyButton, ModalNote } from "./ModalParts";

export default function ChangeDoiModal({
  currentDoi,
  onClose,
  onSave,
  open,
}: {
  currentDoi: string;
  onClose: () => void;
  onSave: (doi: string) => Promise<void>;
  open: boolean;
}) {
  const inputId = useId();
  const [value, setValue] = useState(() => doiSuffix(currentDoi));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Start from the saved DOI each time the modal opens.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setValue(doiSuffix(currentDoi));
      setError(null);
    }
  }

  const nextDoi = `10.${value.trim()}`;

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await onSave(nextDoi);
      onClose();
    } catch (e) {
      setError(doiSaveErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      footerEnd={
        <ModalBusyButton
          busy={saving}
          busyLabel="Saving…"
          disabled={!value.trim() || nextDoi === currentDoi || saving}
          onClick={handleSave}
        >
          Save DOI
        </ModalBusyButton>
      }
      footerStart={
        <Button intent="outline" size="sm" onClick={onClose}>
          Cancel
        </Button>
      }
      kicker="DOI"
      open={open}
      title="Change this pub's DOI"
      onOpenChange={(open) => {
        if (open === false) {
          onClose();
        }
      }}
    >
      <div>
        <FieldLabel htmlFor={inputId}>New DOI</FieldLabel>
        <DoiInput
          disabled={saving}
          error={error ?? undefined}
          id={inputId}
          value={value}
          onChangeValue={(v) => {
            setValue(v);
            setError(null);
          }}
        />
      </div>

      <ModalNote>
        This DOI is self-managed, so The Stacks can&rsquo;t update its metadata.
        After changing it here, update the record with the registrar that issued
        it.
      </ModalNote>
    </Dialog>
  );
}
