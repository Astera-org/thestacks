import FigureLegend, { type LegendSplit } from "@/components/myst/FigureLegend";
import MystActionButton from "@/components/myst/MystActionButton";
import MystFigure from "@/components/myst/MystFigure";
import type { MediaAsset } from "@/types";
import type { NodeRenderer } from "@myst-theme/providers";
import {
  CLASSES,
  DATA_ATTRS,
  DownloadIcon,
  ExpandIcon,
  MEDIA_TYPES
} from "@thestacks/myst-renderer";
import type { GenericNode } from "myst-common";
import type {
  Container as ContainerSpec,
  Iframe as IframeSpec,
  Image as ImageSpec
} from "myst-spec";
import { MyST } from "myst-to-react";
import type { CSSProperties } from "react";
import { useMystmdContext } from "../MystmdContext";
import { safeUrl } from "../safeUrl";
import { QuoteContainer } from "./quotes";

// The same markup the Google Docs renderer's rehype plugins produce
// (figure > .figure-action-target + .figure-caption-wrapper), so MystFigure,
// FigureLegend, the lightbox and prose.css apply unchanged.

const KIND_LABELS: Record<string, string> = {
  figure: "Figure",
  table: "Table",
  code: "Program"
};

const VIDEO = /\.(mp4|webm|mov|ogv|m4v)(\?|#|$)/i;
const AUDIO = /\.(mp3|wav|oga|ogg|m4a|flac)(\?|#|$)/i;
const CSS_LENGTH = /^\d+(\.\d+)?(%|px|em|rem)$/;
const UNITLESS = /^\d+(\.\d+)?$/;

type MediaType = (typeof MEDIA_TYPES)[keyof typeof MEDIA_TYPES];

function imageMediaType(
  mediaAsset: MediaAsset | undefined,
  url: string
): MediaType {
  if (mediaAsset !== undefined) {
    return mediaAsset.kind;
  }
  if (VIDEO.test(url)) return MEDIA_TYPES.VIDEO;
  if (AUDIO.test(url)) return MEDIA_TYPES.AUDIO;
  return MEDIA_TYPES.IMAGE;
}

/** `src` is the first node's URL, as `safeUrl` returned it. */
function mediaTypeOf(
  mediaAsset: MediaAsset | undefined,
  node: GenericNode | undefined,
  src: string | undefined
): MediaType | "table" | undefined {
  if (node?.type === "image") return imageMediaType(mediaAsset, src ?? "");
  if (node?.type === "iframe") return MEDIA_TYPES.IFRAME;
  if (node?.type === "table") return "table";
  return undefined;
}

/**
 * A width the author set, e.g. `:width: 50%`, as a style.
 * A bare number, e.g. `:width: 300`, is in pixels.
 */
function widthStyle(width: unknown): CSSProperties | undefined {
  if (typeof width !== "string") return undefined;
  const length = UNITLESS.test(width) ? `${width}px` : width;
  if (!CSS_LENGTH.test(length)) return undefined;
  return { width: length };
}

/**
 * The asset's aspect ratio as a style, so the browser reserves its space
 * before it loads. An author-set height wins, as in the Google Docs renderer.
 */
function aspectRatioStyle(
  asset: MediaAsset | undefined,
  height: string | undefined
): CSSProperties | undefined {
  if (height || !asset?.width || !asset.height) return undefined;
  return { aspectRatio: `${asset.width} / ${asset.height}`, height: "auto" };
}

/**
 * `data-sized` for the action target of media sized narrower than full, so
 * prose.css shrinks the figure and its caption to it. width:100% is
 * full-width, not sized, as in the Google Docs renderer.
 */
function sizedAttr(media: GenericNode[], mediaType?: string) {
  if (
    mediaType !== MEDIA_TYPES.IMAGE &&
    mediaType !== MEDIA_TYPES.VIDEO &&
    mediaType !== MEDIA_TYPES.IFRAME
  ) {
    return {};
  }
  const width = widthStyle(media[0]?.width)?.width;
  if (!width || width === "100%") return {};
  return { [DATA_ATTRS.SIZED]: "true" };
}

function FigureActions({ mediaType }: { mediaType?: string }) {
  const download =
    mediaType === MEDIA_TYPES.IMAGE ||
    mediaType === MEDIA_TYPES.VIDEO ||
    mediaType === MEDIA_TYPES.AUDIO;
  const expand =
    mediaType === MEDIA_TYPES.IMAGE ||
    mediaType === MEDIA_TYPES.VIDEO ||
    mediaType === MEDIA_TYPES.IFRAME;
  if (!download && !expand) return null;
  return (
    <div className={CLASSES.FIGURE_ACTION_BUTTONS}>
      {download && (
        <MystActionButton
          aria-label="Download"
          className={CLASSES.FIGURE_ACTION_BUTTON}
          type="button"
        >
          <DownloadIcon height={14} width={14} />
        </MystActionButton>
      )}
      {expand && (
        <MystActionButton
          aria-label="Expand"
          className={CLASSES.FIGURE_ACTION_BUTTON}
          type="button"
        >
          <ExpandIcon height={14} width={14} />
        </MystActionButton>
      )}
    </div>
  );
}

/**
 * The caption's first paragraph gets the "Figure 1." label; MyST's own
 * `captionNumber` ("Figure 1:") is dropped in its favour.
 */
function CaptionContent({
  caption,
  label
}: {
  caption?: GenericNode;
  label?: string;
}) {
  const [first, ...rest] = caption?.children ?? [];
  const firstIsParagraph = first?.type === "paragraph";
  const firstChildren = firstIsParagraph
    ? (first.children ?? []).filter(
        (child: GenericNode) => child.type !== "captionNumber"
      )
    : [];
  return (
    <>
      {(label || firstIsParagraph) && (
        <p>
          {label && <span className="caption-label">{label}</span>}
          {firstIsParagraph && (
            <span className="caption-text">
              <MyST ast={firstChildren} />
            </span>
          )}
        </p>
      )}
      {first && !firstIsParagraph && <MyST ast={first} />}
      <MyST ast={rest} />
    </>
  );
}

const ELLIPSIS_CHAR = "\u2026";
const ELLIPSIS: GenericNode = { type: "text", value: ELLIPSIS_CHAR };

function textLength(node: GenericNode): number {
  if (typeof node.value === "string") return node.value.length;
  return (node.children ?? []).reduce(
    (sum: number, child: GenericNode) => sum + textLength(child),
    0
  );
}

type AstTruncation = { nodes: GenericNode[]; used: number; truncated: boolean };

function truncateNodes(nodes: GenericNode[], remaining: number): AstTruncation {
  const out: GenericNode[] = [];
  let used = 0;
  for (const node of nodes) {
    const result = truncateNode(node, Math.max(0, remaining - used));
    out.push(...result.nodes);
    used += result.used;
    if (result.truncated) return { nodes: out, used, truncated: true };
  }
  return { nodes: out, used, truncated: false };
}

/**
 * FigureLegend's ReactNode split, applied to the MyST AST instead: at the
 * top-level node holding the maxChars-th text character.
 */
function splitLegend(nodes: GenericNode[], maxChars: number): LegendSplit {
  let used = 0;
  for (const [i, node] of nodes.entries()) {
    const length = textLength(node);
    if (used + length > maxChars) {
      return {
        head: <MyST ast={nodes.slice(0, i)} />,
        cut: <MyST ast={truncateNode(node, maxChars - used).nodes} />,
        rest: <MyST ast={nodes.slice(i)} />
      };
    }
    used += length;
  }
  return { head: <MyST ast={nodes} />, cut: null, rest: null };
}

/** FigureLegend's ReactNode truncation, applied to the MyST AST instead. */
function truncateNode(node: GenericNode, remaining: number): AstTruncation {
  const length = textLength(node);
  if (length <= remaining) {
    return { nodes: [node], used: length, truncated: false };
  }
  if (node.type === "text") {
    const value = String(node.value);
    const lastSpace = value.lastIndexOf(" ", remaining);
    const cutPoint = lastSpace > 0 ? lastSpace : 0;
    const text = value.slice(0, cutPoint).trimEnd().concat(ELLIPSIS_CHAR);
    return {
      nodes: [{ ...node, value: text }],
      used: cutPoint,
      truncated: true
    };
  }
  // Drop links and atoms like inline code or math rather than cutting them
  if (node.type === "link" || !node.children) {
    return { nodes: [ELLIPSIS], used: 0, truncated: true };
  }
  const result = truncateNodes(node.children, remaining);
  if (result.used === 0) return { nodes: [ELLIPSIS], used: 0, truncated: true };
  return {
    nodes: [{ ...node, children: result.nodes }],
    used: result.used,
    truncated: true
  };
}

const Container: NodeRenderer<ContainerSpec> = ({ node }) => {
  const { mediaAssetByUrl } = useMystmdContext();
  if ((node.kind as string) === "quote") return <QuoteContainer node={node} />;

  const children: GenericNode[] = node.children ?? [];
  const caption = children.find((child) => child.type === "caption");
  const legend = children.find((child) => child.type === "legend");
  const media = children.filter(
    (child) => child.type !== "caption" && child.type !== "legend"
  );
  const kind = node.kind ?? "figure";
  const label =
    node.enumerator && KIND_LABELS[kind]
      ? `${KIND_LABELS[kind]} ${node.enumerator}. `
      : undefined;
  const id = node.html_id;

  if (kind === "code") {
    return (
      <figure className="code-figure" id={id}>
        <MyST ast={media} />
        {(caption || label) && (
          <figcaption className="figure-caption">
            <CaptionContent caption={caption} label={label} />
          </figcaption>
        )}
      </figure>
    );
  }

  const [first] = media;
  const src = safeUrl(first?.url, { allowDataImage: true });
  const mediaAsset = src ? mediaAssetByUrl.get(src) : undefined;
  const mediaType = mediaTypeOf(mediaAsset, first, src);
  return (
    <MystFigure id={id}>
      <div
        className={CLASSES.FIGURE_ACTION_TARGET}
        {...{ [DATA_ATTRS.MEDIA_TYPE]: mediaType }}
        {...sizedAttr(media, mediaType)}
      >
        <MyST ast={media} />
      </div>
      <div className={CLASSES.FIGURE_CAPTION_WRAPPER}>
        <FigureActions mediaType={mediaType} />
        {(caption || legend || label) && (
          <figcaption className="figure-caption">
            <CaptionContent caption={caption} label={label} />
            {legend && (
              <FigureLegend
                className="figure-legend"
                split={(maxChars) =>
                  splitLegend(legend.children ?? [], maxChars)
                }
              >
                <MyST ast={legend.children} />
              </FigureLegend>
            )}
          </figcaption>
        )}
      </div>
    </MystFigure>
  );
};

// myst-spec's Image omits the html_id that MyST assigns to every target
type MystImage = ImageSpec & { html_id?: string };

/** Images, and video or audio files, which MyST also writes as images. */
const Image: NodeRenderer<MystImage> = ({ node }) => {
  const { mediaAssetByUrl } = useMystmdContext();
  const src = safeUrl(node.url, { allowDataImage: true });
  if (!src) return null;

  const mediaAsset = mediaAssetByUrl.get(src);
  const style = {
    ...widthStyle(node.width),
    ...aspectRatioStyle(mediaAsset, node.height)
  };
  const id = node.html_id;
  const type = imageMediaType(mediaAsset, src);

  if (type === MEDIA_TYPES.VIDEO) {
    return (
      <video
        controls
        id={id}
        playsInline
        preload="metadata"
        src={src}
        style={style}
      />
    );
  }

  if (type === MEDIA_TYPES.AUDIO) {
    return <audio controls id={id} preload="metadata" src={src} />;
  }

  if (type === MEDIA_TYPES.IMAGE) {
    return (
      <img
        alt={node.alt ?? ""}
        id={id}
        loading="lazy"
        src={src}
        style={style}
      />
    );
  }

  /**
   * @todo Render file assets (e.g. as a download link) and show an error for
   * media types we don't know, rather than rendering nothing.
   */
  return null;
};

/** No `srcdoc` (see the Google Docs renderer's rehypeStripIframeSrcDoc). */
const Iframe: NodeRenderer<IframeSpec> = ({ node }) => {
  const src = safeUrl(node.src ?? node.url);
  if (!src || !/^https?:/i.test(src)) return null;
  const style = widthStyle(node.width);
  return (
    <iframe
      allowFullScreen
      loading="lazy"
      referrerPolicy="strict-origin-when-cross-origin"
      src={src}
      title={node.title ?? "Embedded content"}
      style={style}
    />
  );
};

export const FIGURE_RENDERERS = {
  container: Container,
  image: Image,
  iframe: Iframe
};
