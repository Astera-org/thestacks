import Avatar from "@/components/stacks-ui/Avatar";
import Button from "@/components/stacks-ui/Button";
import Dialog from "@/components/stacks-ui/Dialog";
import FileInput from "@/components/stacks-ui/FileInput";
import RangeInput from "@/components/stacks-ui/RangeInput";
import React, { useCallback, useRef, useState } from "react";
import ReactCrop, {
  PercentCrop,
  PixelCrop,
  centerCrop,
  convertToPixelCrop,
  makeAspectCrop
} from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";

interface AvatarSelectorProps {
  currentAvatarSrc?: string;
  currentAvatarFallback?: string;
  onAvatarChange: (file: File) => void;
  disabled?: boolean;
}

function getCroppedImg(
  image: HTMLImageElement,
  crop: PixelCrop
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("No 2d context");
  }

  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;

  const pixelRatio = window.devicePixelRatio;
  canvas.width = Math.floor(crop.width * scaleX * pixelRatio);
  canvas.height = Math.floor(crop.height * scaleY * pixelRatio);

  ctx.scale(pixelRatio, pixelRatio);
  ctx.imageSmoothingQuality = "high";

  const cropX = crop.x * scaleX;
  const cropY = crop.y * scaleY;

  ctx.drawImage(
    image,
    cropX,
    cropY,
    crop.width * scaleX,
    crop.height * scaleY,
    0,
    0,
    crop.width * scaleX,
    crop.height * scaleY
  );

  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        }
      },
      "image/jpeg",
      0.9
    );
  });
}

// The default crop: a square 150px wide, centered on an image of the given
// rendered size.
function getCenteredCrop(width: number, height: number): PercentCrop {
  const crop = makeAspectCrop(
    {
      unit: "%",
      width: (150 / width) * 100
    },
    1,
    width,
    height
  );
  return centerCrop(crop, width, height);
}

export default function AvatarSelector(props: AvatarSelectorProps) {
  const { currentAvatarSrc, currentAvatarFallback, onAvatarChange, disabled } =
    props;

  const [isOpen, setIsOpen] = useState(false);
  const [imageSrc, setImageSrc] = useState<string>("");
  const [crop, setCrop] = useState<PercentCrop>();
  const [scale, setScale] = useState(1);

  const imgRef = useRef<HTMLImageElement>(null);

  const onSelectFile = (file: File | null) => {
    if (file) {
      setCrop(undefined);
      const reader = new FileReader();
      reader.addEventListener("load", () => {
        setImageSrc(reader.result?.toString() || "");
        setIsOpen(true);
      });
      reader.readAsDataURL(file);
    }
  };

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    setCrop(getCenteredCrop(width, height));
  };

  const handleSave = useCallback(async () => {
    if (imgRef.current && crop?.width && crop?.height) {
      const img = imgRef.current;
      const centerX = img.width / 2;
      const centerY = img.height / 2;

      // Convert at save time, against the image's current size. A pixel
      // snapshot taken earlier goes stale if the image is measured while the
      // dialog animates in or resized before saving, which offsets the saved
      // crop.
      const pixelCrop = convertToPixelCrop(crop, img.width, img.height);

      // CSS transform: scale() zooms from center without affecting layout.
      // ReactCrop measures in layout space, so we must reverse the transform
      // to find which region of the original image the crop box actually covers.
      const scaleAdjustedCrop: PixelCrop = {
        unit: "px",
        x: centerX + (pixelCrop.x - centerX) / scale,
        y: centerY + (pixelCrop.y - centerY) / scale,
        width: pixelCrop.width / scale,
        height: pixelCrop.height / scale
      };

      const croppedImageBlob = await getCroppedImg(img, scaleAdjustedCrop);
      const file = new File([croppedImageBlob], "avatar.jpg", {
        type: "image/jpeg"
      });
      onAvatarChange(file);
      setIsOpen(false);
      setImageSrc("");
      setScale(1);
    }
  }, [crop, scale, onAvatarChange]);

  const handleCancel = () => {
    setIsOpen(false);
    setImageSrc("");
    setScale(1);
    setCrop(undefined);
  };

  const resetCrop = () => {
    setScale(1);
    if (imgRef.current) {
      const { width, height } = imgRef.current;
      setCrop(getCenteredCrop(width, height));
    }
  };

  return (
    <>
      <div className="flex items-center gap-6">
        <Avatar
          src={currentAvatarSrc}
          alt={currentAvatarFallback}
          className="border-border-strong bg-surface size-16 border md:size-20"
        />
        <div className="space-y-2">
          <FileInput
            accept="image/*"
            showFilename={false}
            buttonLabel="Change avatar"
            buttonClassName="text-carbon-500 border-carbon-500 hover:bg-carbon-500 bg-transparent hover:text-fg-inverted"
            disabled={disabled}
            onChange={onSelectFile}
          />
          <p id="avatar-upload-hint" className="text-body-20 text-fg-muted">
            JPG, PNG, or GIF up to 10 MB.
          </p>
        </div>
      </div>

      <Dialog
        open={isOpen}
        onOpenChange={(open) => (open ? setIsOpen(true) : handleCancel())}
        title="Crop and scale your avatar"
        description="Adjust the crop area and scale, then save your avatar."
        className="max-w-2xl"
      >
        <div className="flex flex-col gap-6">
          {imageSrc && (
            <>
              <div className="flex items-center gap-4">
                <span
                  id="avatar-scale-label"
                  className="text-body-30 text-carbon-500 shrink-0 font-sans"
                >
                  Scale
                </span>
                <RangeInput
                  aria-labelledby="avatar-scale-label"
                  min={0.5}
                  max={3}
                  step={0.1}
                  value={[scale]}
                  onValueChange={(value) => setScale(value[0])}
                  className="flex-1"
                />
                <span className="text-caption-40 text-carbon-500 shrink-0 font-mono">
                  {scale.toFixed(1)}x
                </span>
                <Button
                  type="button"
                  size="sm"
                  intent="secondary"
                  onClick={resetCrop}
                >
                  Reset
                </Button>
              </div>

              <div className="border-border-strong flex justify-center overflow-hidden rounded-lg border bg-gray-200">
                <ReactCrop
                  crop={crop}
                  onChange={(_, percentCrop) => setCrop(percentCrop)}
                  aspect={1}
                  minWidth={50}
                  minHeight={50}
                  keepSelection
                >
                  <img
                    ref={imgRef}
                    alt="Crop preview"
                    src={imageSrc}
                    style={{
                      transform: `scale(${scale})`,
                      maxHeight: "400px",
                      maxWidth: "100%"
                    }}
                    onLoad={onImageLoad}
                  />
                </ReactCrop>
              </div>
            </>
          )}

          <div className="flex justify-end gap-3">
            <Button type="button" intent="secondary" onClick={handleCancel}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={!crop?.width || !crop?.height}
            >
              Save avatar
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
