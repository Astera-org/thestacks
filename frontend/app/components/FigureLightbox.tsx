import DownloadFilledIcon from "@/components/icons/DownloadFilled";
import IconButton from "@/components/stacks-ui/IconButton";
import { cn, downloadFromUrl } from "@/lib/utils";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

export type LightboxContentType = "image" | "video" | "iframe";

const ZOOM_SCALE_FACTOR = 1.75;

/** Extracts filename from an S3 blob URL.
 *
 * @param src - The URL of the file to extract the filename from.
 * @returns The filename.
 */
function getFilename(src: string): string {
  try {
    return new URL(src).pathname.split("/").pop() || "download";
  } catch {
    return "download";
  }
}

interface FigureLightboxProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  src: string;
  /** Inline iframe document; used instead of `src` when set. */
  srcDoc?: string;
  /** iframe sandbox tokens, mirrored from the in-page embed. */
  sandbox?: string;
  captionHtml: string;
  contentType: LightboxContentType;
  downloadFilename?: string;
  aspectRatio?: string;
}

export default function FigureLightbox(props: FigureLightboxProps) {
  const {
    open,
    onOpenChange,
    src,
    srcDoc,
    sandbox,
    captionHtml,
    contentType,
    downloadFilename,
    aspectRatio
  } = props;

  const [isZoomed, setIsZoomed] = useState(false);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const [imageRatio, setImageRatio] = useState<number>();
  const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const resetZoom = useCallback(() => {
    setIsZoomed(false);
    setPan({ x: 0, y: 0 });
  }, []);

  // Track viewport size for responsive iframe sizing
  useEffect(() => {
    const updateViewportSize = () => {
      setViewportSize({ width: window.innerWidth, height: window.innerHeight });
    };
    updateViewportSize();
    window.addEventListener("resize", updateViewportSize);
    return () => window.removeEventListener("resize", updateViewportSize);
  }, []);

  // Reset zoom when src changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    resetZoom();
  }, [src, resetZoom]);

  // Close when clicking outside the container
  const handleContentClick = (e: React.MouseEvent) => {
    if (
      containerRef.current &&
      !containerRef.current.contains(e.target as Node)
    ) {
      handleOpenChange(false);
    }
  };

  // Constrain pan so image doesn't leave container
  const constrainPan = useCallback(
    (x: number, y: number): { x: number; y: number } => {
      const img = imageRef.current;
      const container = containerRef.current?.querySelector(
        ".figure-lightbox-image-section"
      );
      if (!img || !container) return { x, y };

      const containerRect = container.getBoundingClientRect();
      const scale = ZOOM_SCALE_FACTOR;
      const scaledW = img.offsetWidth * scale;
      const scaledH = img.offsetHeight * scale;

      // Calculate max pan distance (how far image extends beyond container)
      const maxPanX = Math.max(0, (scaledW - containerRect.width) / 2);
      const maxPanY = Math.max(0, (scaledH - containerRect.height) / 2);

      return {
        x: Math.max(-maxPanX, Math.min(maxPanX, x)),
        y: Math.max(-maxPanY, Math.min(maxPanY, y))
      };
    },
    []
  );

  const handleImageClick = (e: React.MouseEvent) => {
    if (isDragging) return;
    e.stopPropagation();
    if (isZoomed) {
      resetZoom();
    } else {
      setIsZoomed(true);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isZoomed) return;
    e.preventDefault();
    setIsDragging(false);
    dragStart.current = {
      x: e.clientX,
      y: e.clientY,
      panX: pan.x,
      panY: pan.y
    };

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        setIsDragging(true);
      }
      setPan(
        constrainPan(dragStart.current.panX + dx, dragStart.current.panY + dy)
      );
    };

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      // Reset dragging state after a tick to prevent click from firing.
      setTimeout(() => setIsDragging(false), 0);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  // Reset zoom state when dialog closes.
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetZoom();
      setImageRatio(undefined);
    }
    onOpenChange(open);
  };

  const showDownload = contentType === "image" || contentType === "video";
  const targetFilename = downloadFilename || getFilename(src);

  // Fit the image to the bounded card (<=80svh tall, <=80vw wide minus caption)
  // at its real ratio. Explicit sizing lets SVGs (no intrinsic size) fill too.
  const CAPTION_W = 384; // max-w-96
  const boxH = viewportSize.height * 0.8 - 40; // 80svh minus padding/border
  const boxW = viewportSize.width * 0.8 - CAPTION_W - 44; // 80vw minus caption/gap/padding/border
  const imageBox =
    contentType === "image" && imageRatio && boxW > 80 && boxH > 80
      ? (() => {
          let width = boxW;
          let height = boxW / imageRatio;
          if (height > boxH) {
            height = boxH;
            width = boxH * imageRatio;
          }
          return { width: Math.round(width), height: Math.round(height) };
        })()
      : undefined;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={handleOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="bg-carbon-900/85 data-[state=open]:animate-in data-[state=open]:fade-in-0 fixed inset-0 z-250 duration-500 ease-out" />
        <DialogPrimitive.Content
          className="data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 fixed inset-0 z-251 flex items-center justify-center p-10 duration-300 ease-out focus:outline-none"
          onClick={handleContentClick}
        >
          <DialogPrimitive.Title className="sr-only">
            Figure lightbox
          </DialogPrimitive.Title>
          <div
            ref={containerRef}
            className="bg-surface relative flex max-h-[80svh] max-w-[80vw] gap-2 rounded border-2 border-gray-700"
          >
            <DialogPrimitive.Close asChild>
              <IconButton
                pill
                size="lg"
                aria-label="Close"
                icon={<X className="size-6" />}
                className="absolute -top-4 -right-4 z-252 cursor-pointer"
              />
            </DialogPrimitive.Close>
            <div
              className={cn(
                "figure-lightbox-image-section flex items-center justify-center overflow-hidden p-4",
                contentType === "image" &&
                  (isZoomed
                    ? "cursor-grab active:cursor-grabbing"
                    : "cursor-zoom-in")
              )}
            >
              {contentType === "image" && (
                <img
                  ref={imageRef}
                  src={src}
                  alt=""
                  className={cn(
                    "object-contain select-none",
                    // Fallback until the ratio is known.
                    !imageBox && "h-[80svh] w-auto max-w-[80vw]",
                    isZoomed
                      ? "transition-none"
                      : "transition-transform duration-200"
                  )}
                  style={{
                    ...imageBox,
                    ...(isZoomed
                      ? {
                          transform: `scale(${ZOOM_SCALE_FACTOR}) translate(${pan.x / ZOOM_SCALE_FACTOR}px, ${pan.y / ZOOM_SCALE_FACTOR}px)`
                        }
                      : {})
                  }}
                  onLoad={(e) => {
                    const img = e.currentTarget;
                    if (img.naturalWidth > 0) {
                      setImageRatio(img.naturalWidth / img.naturalHeight);
                    }
                  }}
                  onClick={handleImageClick}
                  onMouseDown={handleMouseDown}
                  draggable={false}
                />
              )}
              {contentType === "video" && (
                <video
                  src={src}
                  controls
                  playsInline
                  className="max-h-[80svh] max-w-full"
                />
              )}
              {contentType === "iframe" &&
                (() => {
                  // Calculate optimal dimensions based on aspect ratio and viewport
                  let iframeStyle: React.CSSProperties | undefined;
                  if (aspectRatio && viewportSize.width > 0) {
                    const [w, h] = aspectRatio.split("/").map(Number);
                    if (w && h) {
                      const ratio = w / h;
                      const maxW = viewportSize.width * 0.85;
                      const maxH = viewportSize.height * 0.8;
                      // Calculate both possible dimensions and pick the one that fits
                      const widthFromHeight = maxH * ratio;
                      const heightFromWidth = maxW / ratio;
                      if (widthFromHeight <= maxW) {
                        // Height-constrained: use maxH and calculate width
                        iframeStyle = { width: widthFromHeight, height: maxH };
                      } else {
                        // Width-constrained: use maxW and calculate height
                        iframeStyle = { width: maxW, height: heightFromWidth };
                      }
                    }
                  }
                  return (
                    <iframe
                      src={srcDoc ? undefined : src}
                      srcDoc={srcDoc}
                      sandbox={sandbox}
                      className="h-[70svh] w-[70vw] border-none"
                      style={iframeStyle}
                      title="Embedded content"
                    />
                  );
                })()}
            </div>
            <div className="flex max-h-[80svh] max-w-96 min-w-80 flex-col">
              {captionHtml && (
                <div
                  className="figure-lightbox-caption-section min-h-0 flex-1 overflow-y-auto pt-6 pr-6 pb-4 pl-0"
                  dangerouslySetInnerHTML={{ __html: captionHtml }}
                />
              )}
              {showDownload && (
                <a
                  href={src}
                  download={targetFilename}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-body-20 text-fg-subtle group hover:text-fg-strong flex shrink-0 cursor-pointer items-center gap-1.5 self-end pt-3 pr-6 pb-4 pl-0 font-sans font-normal no-underline transition-colors duration-200"
                  onClick={async (e) => {
                    e.preventDefault();
                    await downloadFromUrl(src, targetFilename);
                  }}
                >
                  Download figure
                  <DownloadFilledIcon
                    width={23}
                    height={23}
                    className="text-gray-blue-800 group-hover:text-fg-strong transition-colors duration-200"
                  />
                </a>
              )}
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
