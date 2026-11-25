import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCallback, useEffect, useState } from "react";
import Button from "../stacks-ui/Button";

interface LinkModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialUrl?: string;
  onSave: (url: string) => void;
}

function isValidUrl(url: string): boolean {
  if (!url.trim()) return false;
  try {
    // If it doesn't start with a protocol, prepend https://
    const urlToTest = url.match(/^https?:\/\//) ? url : `https://${url}`;
    new URL(urlToTest);
    return true;
  } catch {
    return false;
  }
}

export function LinkModal(props: LinkModalProps) {
  const { open, onOpenChange, initialUrl = "", onSave } = props;
  const [url, setUrl] = useState(initialUrl);
  const [error, setError] = useState("");

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUrl(initialUrl);
      setError("");
    }
  }, [open, initialUrl]);

  const handleSave = useCallback(() => {
    if (!isValidUrl(url)) {
      setError("Please enter a valid URL");
      return;
    }

    // Prepend https:// if no protocol is specified
    const finalUrl = url.match(/^https?:\/\//) ? url : `https://${url}`;
    onSave(finalUrl);
    onOpenChange(false);
  }, [url, onSave, onOpenChange]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleSave();
      }
    },
    [handleSave]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-surface sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{initialUrl ? "Edit Link" : "Add Link"}</DialogTitle>
          <DialogDescription>
            Enter the URL for the link. The link will open in a new tab.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2 font-sans text-base">
            <Label htmlFor="link-url" className="text-base md:text-lg">
              URL
            </Label>
            <Input
              id="link-url"
              type="url"
              placeholder="https://example.com"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setError("");
              }}
              onKeyDown={handleKeyDown}
              className="bg-carbon-700/10"
              autoFocus
            />
            {error && <p className="text-error-800 text-sm">{error}</p>}
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            onClick={() => onOpenChange(false)}
            className="bg-carbon-700/75"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            className="bg-periwinkle-900"
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
