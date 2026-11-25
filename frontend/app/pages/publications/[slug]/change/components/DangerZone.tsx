import { TrashIcon } from "@/components/icons";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import Button from "@/components/stacks-ui/Button";
import Dialog from "@/components/stacks-ui/Dialog";
import { DeleteMutation } from "@/hooks/use-edit-publication/types";
import { useState } from "react";
import FieldError from "./FieldError";

export default function DangerZone({
  deleteError,
  deleteMutation,
  disabled,
}: {
  deleteError: string | null;
  deleteMutation: DeleteMutation;
  disabled?: boolean;
}) {
  const [showDialog, setShowDialog] = useState<boolean>(false);

  return (
    <div className="border-border flex flex-col gap-4 rounded-xl border p-4 md:flex-row md:items-center md:justify-between md:px-5">
      <div className="flex items-center gap-4">
        <span className="bg-gray-blue-700 text-fg-inverted flex size-11 shrink-0 items-center justify-center rounded-md">
          <TrashIcon aria-hidden className="size-5" />
        </span>
        <div>
          <h2 className="text-body-30 text-fg-strong font-medium">
            Delete draft
          </h2>
          <p className="text-body-20 text-fg-muted mt-0.5">
            Permanently remove this draft. This cannot be undone.
          </p>
        </div>
      </div>
      <Button
        className="shrink-0"
        disabled={disabled}
        intent="outline"
        onClick={() => setShowDialog(true)}
      >
        Delete draft
      </Button>
      <Dialog
        description="Confirm that you want to permanently delete this draft."
        open={showDialog || deleteMutation.isPending}
        title="Delete draft?"
        onOpenChange={(open) =>
          !deleteMutation.isPending && setShowDialog(open)
        }
      >
        <div className="flex flex-col gap-6">
          <p className="text-body-30 text-fg">
            Permanently remove this draft. This cannot be undone.
          </p>

          {deleteError && <FieldError announce message={deleteError} />}

          <div className="flex justify-end gap-3">
            <Button
              disabled={deleteMutation.isPending}
              intent="secondary"
              onClick={() => setShowDialog(false)}
            >
              Cancel
            </Button>
            <Button
              disabled={deleteMutation.isPending}
              intent="destructive"
              onClick={() => deleteMutation.mutate()}
            >
              {deleteMutation.isPending ? (
                <span className="flex items-center gap-2">
                  Deleting
                  <LoadingSpinner isDark />
                </span>
              ) : (
                "Delete draft"
              )}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
