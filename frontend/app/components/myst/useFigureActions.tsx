import FigureLightbox, {
  type LightboxContentType
} from "@/components/FigureLightbox";
import { legendFullHtmlMap } from "@/components/myst/FigureLegend";
import { type MystContextValue } from "@/components/myst/MystContext";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { downloadFromUrl } from "@/lib/utils";
import {
  CLASSES,
  DATA_ATTRS,
  MEDIA_TYPES,
  generateCustomFilename
} from "@thestacks/myst-renderer";
import { type ReactNode, useCallback, useMemo, useState } from "react";

/**
 * Parse a srcset attribute and return the highest resolution URL.
 * srcset format: "url1 1x, url2 2x, url3 3x"
 */
function getHighestResSrcFromSrcset(srcset: string | null): string | undefined {
  if (!srcset) return undefined;

  try {
    let highest: { url: string; multiplier: number } | null = null;

    for (const entry of srcset.split(",")) {
      const parts = entry.trim().split(/\s+/);
      const url = parts[0];
      const descriptor = parts[1] || "1x";

      if (!descriptor.endsWith("x")) continue;
      const multiplier = parseFloat(descriptor.slice(0, -1));
      if (isNaN(multiplier)) continue;

      if (!highest || multiplier > highest.multiplier) {
        highest = { url, multiplier };
      }
    }

    return highest?.url;
  } catch {
    return undefined;
  }
}

/**
 * The figure Expand (lightbox) and Download actions, shared by both
 * publication renderers. Provide `mystContextValue` through `MystProvider`
 * around the figures, and render `lightbox` next to them.
 */
export function useFigureActions(publicationSlug: string | undefined): {
  mystContextValue: MystContextValue;
  lightbox: ReactNode;
} {
  // The lightbox (and its expand trigger) only render at md and up.
  const isMd = useBreakpoint("md");

  // Lightbox state
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState("");
  const [lightboxSrcDoc, setLightboxSrcDoc] = useState<string | undefined>(
    undefined
  );
  const [lightboxSandbox, setLightboxSandbox] = useState<string | undefined>(
    undefined
  );
  const [lightboxCaptionHtml, setLightboxCaptionHtml] = useState("");
  const [lightboxContentType, setLightboxContentType] =
    useState<LightboxContentType>("image");
  const [lightboxFilename, setLightboxFilename] = useState<string | undefined>(
    undefined
  );
  const [lightboxAspectRatio, setLightboxAspectRatio] = useState<
    string | undefined
  >(undefined);

  // Preload an image and return a promise that resolves when loaded (or on timeout)
  const preloadImage = useCallback((src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve) => {
      const img = new Image();
      const timeout = setTimeout(() => resolve(img), 3000);
      img.onload = () => {
        clearTimeout(timeout);
        resolve(img);
      };
      img.onerror = () => {
        clearTimeout(timeout);
        resolve(img);
      };
      img.src = src;
    });
  }, []);

  // Handler: expand a figure into the lightbox
  const onExpandFigure = useCallback(
    async (figureEl: HTMLElement) => {
      const actionTarget = figureEl.querySelector(
        `.${CLASSES.FIGURE_ACTION_TARGET}`
      ) as HTMLElement | null;
      if (!actionTarget) return;

      const type = actionTarget.getAttribute(
        DATA_ATTRS.MEDIA_TYPE
      ) as LightboxContentType | null;
      if (!type) return;

      const selector = type === MEDIA_TYPES.IMAGE ? "img" : type;
      const mediaEl = actionTarget.querySelector(selector) as HTMLElement & {
        src?: string;
      };

      const aspectRatio =
        mediaEl?.getAttribute(DATA_ATTRS.ASPECT_RATIO) || undefined;

      let src: string | undefined;
      if (type === MEDIA_TYPES.IMAGE) {
        const srcset = mediaEl?.getAttribute("srcset");
        src = getHighestResSrcFromSrcset(srcset) || mediaEl?.src;
      } else {
        src = mediaEl?.src;
      }
      // Inline embeds (e.g. gist data: URIs) carry their content in `srcdoc`
      // with no `src`; pass it, and its sandbox, through to the lightbox.
      const srcDoc =
        type === MEDIA_TYPES.IFRAME
          ? mediaEl?.getAttribute("srcdoc") || undefined
          : undefined;
      const sandbox = srcDoc
        ? (mediaEl?.getAttribute("sandbox") ?? undefined)
        : undefined;
      if (!src && !srcDoc) return;
      src = src || "";

      // For images, preload before opening lightbox
      if (type === MEDIA_TYPES.IMAGE) {
        const expandBtn = figureEl.querySelector(
          `.${CLASSES.FIGURE_ACTION_BUTTON}[aria-label="Expand"]`
        );
        expandBtn?.classList.add("loading");
        await preloadImage(src);
        expandBtn?.classList.remove("loading");
      }

      // Build the lightbox caption from a clone: drop the action buttons (the
      // lightbox has its own download control) and restore the full legend if it
      // was truncated in-page.
      let captionHtml = "";
      const captionWrapper = figureEl.querySelector(
        `.${CLASSES.FIGURE_CAPTION_WRAPPER}`
      );
      if (captionWrapper) {
        const tempWrapper = captionWrapper.cloneNode(true) as HTMLElement;
        tempWrapper
          .querySelector(`.${CLASSES.FIGURE_ACTION_BUTTONS}`)
          ?.remove();

        const legend = captionWrapper.querySelector(
          ".figure-legend"
        ) as HTMLElement | null;
        if (legend && legendFullHtmlMap.has(legend)) {
          const tempLegend = tempWrapper.querySelector(".figure-legend");
          if (tempLegend) {
            tempLegend.innerHTML = legendFullHtmlMap.get(legend)!;
          }
        }
        captionHtml = tempWrapper.innerHTML;
      }

      setLightboxSrc(src);
      setLightboxSrcDoc(srcDoc);
      setLightboxSandbox(sandbox);
      setLightboxContentType(type);
      setLightboxCaptionHtml(captionHtml);
      setLightboxAspectRatio(aspectRatio);

      const captionLabel =
        figureEl.querySelector(".caption-label")?.textContent;
      setLightboxFilename(
        generateCustomFilename(captionLabel, publicationSlug, src, type)
      );
      setLightboxOpen(true);
    },
    [publicationSlug, preloadImage]
  );

  // Handler: download media from a figure action target
  const onDownloadMedia = useCallback(
    async (targetEl: HTMLElement) => {
      const media = targetEl.querySelector(
        "img, video, audio"
      ) as HTMLMediaElement | null;
      if (!media?.src) return;

      const isImage = media.tagName.toLowerCase() === "img";
      const srcset = isImage ? media.getAttribute("srcset") : null;
      const downloadSrc = getHighestResSrcFromSrcset(srcset) || media.src;

      let filename = "download";

      // Try custom filename from caption label
      const figure = targetEl.closest("figure");
      if (figure && publicationSlug) {
        const typeAttr = targetEl.getAttribute(DATA_ATTRS.MEDIA_TYPE) as
          LightboxContentType | undefined;
        const mediaType =
          typeAttr ||
          (media.tagName.toLowerCase() === "video" ? "video" : "image");

        const captionLabel =
          figure.querySelector(".caption-label")?.textContent;
        const custom = generateCustomFilename(
          captionLabel,
          publicationSlug,
          downloadSrc,
          mediaType
        );

        if (custom) filename = custom;
      }

      // Fallback: extract filename from URL
      if (filename === "download") {
        try {
          const urlPath = new URL(downloadSrc).pathname;
          filename = urlPath.split("/").pop() || "download";
        } catch {
          // ignore
        }
      }

      await downloadFromUrl(downloadSrc, filename);
    },
    [publicationSlug]
  );

  const mystContextValue = useMemo<MystContextValue>(
    () => ({
      onExpandFigure,
      onDownloadMedia,
      publicationSlug
    }),
    [onExpandFigure, onDownloadMedia, publicationSlug]
  );

  const lightbox = (
    <>
      {isMd && (
        <FigureLightbox
          open={lightboxOpen}
          onOpenChange={setLightboxOpen}
          src={lightboxSrc}
          srcDoc={lightboxSrcDoc}
          sandbox={lightboxSandbox}
          captionHtml={lightboxCaptionHtml}
          contentType={lightboxContentType}
          downloadFilename={lightboxFilename}
          aspectRatio={lightboxAspectRatio}
        />
      )}
    </>
  );

  return { mystContextValue, lightbox };
}
