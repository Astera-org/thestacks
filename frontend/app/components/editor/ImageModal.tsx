import Button from "@/components/stacks-ui/Button";
import FileInput from "@/components/stacks-ui/FileInput";
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
import { SAFE_IMAGE_MIME_TYPES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Globe, Loader2, Upload } from "lucide-react";
import { useCallback, useState } from "react";

const MAX_SIZE_BYTES = 10 * 1000 * 1000; // 10 MB.

type ImageSource = "upload" | "url";

interface ImageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // When editing an existing image, this is the current alt text.
  initialAltText?: string;
  // When editing, we only allow changing alt text (no file input).
  isEditing?: boolean;
  // Called when the user confirms the image. For new images, includes
  // either a file (upload) or an image URL.
  onSave: (
    file: File | null,
    altText: string,
    imageUrl?: string
  ) => Promise<void>;
}

function validateFile(file: File) {
  if (!SAFE_IMAGE_MIME_TYPES.includes(file.type)) {
    return "Only JPEG, PNG, GIF, and WebP images are allowed";
  }
  if (file.size > MAX_SIZE_BYTES) {
    return "Image must be 10 MB or smaller";
  }
  return null;
}

/**
 * Normalize a user-entered URL by prepending https:// if no protocol is given.
 * Returns the normalized URL string, or null if the input is invalid.
 */
function normalizeImageUrl(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;
  try {
    const withProtocol = trimmed.match(/^https?:\/\//)
      ? trimmed
      : `https://${trimmed}`;
    new URL(withProtocol);
    return withProtocol;
  } catch {
    return null;
  }
}

export function ImageModal(props: ImageModalProps) {
  const {
    open,
    onOpenChange,
    initialAltText = "",
    isEditing = false,
    onSave
  } = props;

  const [source, setSource] = useState<ImageSource>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [altText, setAltText] = useState(initialAltText);
  const [error, setError] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  // Start from a clean form each time the modal opens.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setSource("upload");
      setFile(null);
      setImageUrl("");
      setAltText(initialAltText);
      setError("");
      setIsUploading(false);
    }
  }

  const handleFileChange = useCallback((selectedFile: File | null) => {
    if (!selectedFile) return;

    const validationError = validateFile(selectedFile);
    if (validationError) {
      setError(validationError);
      setFile(null);
      return;
    }

    setError("");
    setFile(selectedFile);
  }, []);

  const handleSave = useCallback(async () => {
    if (!isEditing) {
      if (source === "upload" && !file) {
        setError("Please select an image");
        return;
      }
      if (source === "url") {
        if (!imageUrl.trim()) {
          setError("Please enter an image URL");
          return;
        }
        if (!normalizeImageUrl(imageUrl)) {
          setError("Please enter a valid URL");
          return;
        }
      }
    }

    // Alt text is optional but recommended.
    const trimmedAlt = altText.trim();

    setIsUploading(true);
    setError("");

    try {
      if (source === "url" && !isEditing) {
        const finalUrl = normalizeImageUrl(imageUrl);
        await onSave(null, trimmedAlt, finalUrl!);
      } else {
        await onSave(file, trimmedAlt);
      }
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add image");
    } finally {
      setIsUploading(false);
    }
  }, [file, imageUrl, altText, source, isEditing, onSave, onOpenChange]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !isUploading) {
        e.preventDefault();
        handleSave();
      }
    },
    [handleSave, isUploading]
  );

  const isSaveDisabled =
    isUploading ||
    (!isEditing && source === "upload" && !file) ||
    (!isEditing && source === "url" && !imageUrl.trim());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-surface overflow-x-hidden sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Image" : "Add Image"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the alt text for this image."
              : "Upload an image or paste an image URL."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid min-w-0 gap-4 py-4">
          {/* Source toggle - only shown when adding new image. */}
          {!isEditing && (
            <div
              className="flex gap-1 rounded-lg border p-1"
              role="group"
              aria-label="Image source"
            >
              <button
                type="button"
                aria-pressed={source === "upload"}
                onClick={() => {
                  setSource("upload");
                  setError("");
                }}
                className={cn(
                  "flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  source === "upload"
                    ? "bg-carbon-700/10 text-fg"
                    : "text-fg-muted hover:text-fg hover:bg-surface-hover/5"
                )}
              >
                <Upload className="h-4 w-4" />
                Upload
              </button>
              <button
                type="button"
                aria-pressed={source === "url"}
                onClick={() => {
                  setSource("url");
                  setError("");
                }}
                className={cn(
                  "flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  source === "url"
                    ? "bg-carbon-700/10 text-fg"
                    : "text-fg-muted hover:text-fg hover:bg-surface-hover/5"
                )}
              >
                <Globe className="h-4 w-4" />
                URL
              </button>
            </div>
          )}

          {/* File input - shown when adding new image via upload. */}
          {!isEditing && source === "upload" && (
            <FileInput
              id="image-file"
              label="Image"
              accept={SAFE_IMAGE_MIME_TYPES.join(",")}
              value={file}
              onChange={handleFileChange}
              icon={<Upload className="h-4 w-4" />}
              disabled={isUploading}
              description={
                file ? `${(file.size / 1000 / 1000).toFixed(2)} MB` : undefined
              }
            />
          )}

          {/* URL input - shown when adding new image via URL. */}
          {!isEditing && source === "url" && (
            <div className="grid gap-2 font-sans text-base">
              <Label htmlFor="image-url" className="text-base md:text-lg">
                Image URL
              </Label>
              <Input
                id="image-url"
                type="url"
                placeholder="https://example.com/image.png"
                value={imageUrl}
                onChange={(e) => {
                  setImageUrl(e.target.value);
                  setError("");
                }}
                onKeyDown={handleKeyDown}
                className="bg-carbon-700/10 text-sm md:text-base md:placeholder:text-base"
                disabled={isUploading}
                autoFocus
              />
            </div>
          )}

          {/* Alt text input. */}
          <div className="grid gap-2 font-sans text-base">
            <Label htmlFor="image-alt" className="text-base md:text-lg">
              Alt Text
              <span className="text-fg-muted ml-1 text-sm">
                (recommended for accessibility)
              </span>
            </Label>
            <Input
              id="image-alt"
              type="text"
              placeholder="Describe the image..."
              value={altText}
              onChange={(e) => setAltText(e.target.value)}
              onKeyDown={handleKeyDown}
              className="bg-carbon-700/10 text-sm md:text-base md:placeholder:text-base"
              disabled={isUploading}
              autoFocus={isEditing}
            />
          </div>

          {error && <p className="text-error-800 text-sm">{error}</p>}
        </div>
        <DialogFooter>
          <Button
            type="button"
            onClick={() => onOpenChange(false)}
            className="bg-carbon-700/75"
            disabled={isUploading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            className="bg-periwinkle-900"
            disabled={isSaveDisabled}
          >
            {isUploading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {source === "upload" ? "Uploading..." : "Adding..."}
              </div>
            ) : isEditing ? (
              "Save"
            ) : (
              "Add"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
