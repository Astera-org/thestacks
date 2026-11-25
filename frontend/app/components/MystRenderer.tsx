import MystActionButton from "@/components/myst/MystActionButton";
import { MystProvider } from "@/components/myst/MystContext";
import MystDiv from "@/components/myst/MystDiv";
import MystFigure from "@/components/myst/MystFigure";
import MystSpan from "@/components/myst/MystSpan";
import { useFigureActions } from "@/components/myst/useFigureActions";
import { Skeleton } from "@/components/Skeleton";
import { SAFE_IMAGE_MIME_TYPES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { Publication } from "@/types";
import {
  Platform,
  normalizeEmphasisUnderscores,
  normalizeListIndentation,
  rehypeBackmatter,
  rehypeExtractFigureCaption,
  rehypeFigureActionButtons,
  rehypeFigureCaptionWrapper,
  rehypeFileDownload,
  rehypeGistDataUriEmbed,
  rehypeImageSize,
  rehypeMergeAdjacentLinks,
  rehypeReferenceLinks,
  rehypeSocial,
  rehypeStripIframeSrcDoc,
  rehypeTableEdgeCells,
  rehypeTableHeaderRows,
  rehypeTableRowGroups,
  rehypeTableScrollWrapper,
  remarkCustomDirective,
  remarkDemathifyAccidents
} from "@thestacks/myst-renderer";
import type { Root as HastRoot } from "hast";
import {
  useEffect,
  useMemo,
  useRef,
  type ComponentProps,
  type ReactNode
} from "react";
import Markdown, {
  defaultUrlTransform,
  type UrlTransform
} from "react-markdown";
import rehypeExternalLinks from "rehype-external-links";
import rehypeHighlight from "rehype-highlight";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import rehypeSlug from "rehype-slug";
import remarkDirective from "remark-directive";
import remarkGfm from "remark-gfm";
import remarkHeadingId from "remark-heading-id";
import remarkMath from "remark-math";
import { CONTINUE, SKIP, visit } from "unist-util-visit";

// #region Helpers

// react-markdown blocks all `data:` URIs by default, including safe inline
// images. Allow a known-safe set of image types; defer everything else.
const SAFE_DATA_IMAGE_URL_PREFIXES = SAFE_IMAGE_MIME_TYPES.map(
  (mimeType) => `data:${mimeType}`
);

const urlTransform: UrlTransform = (url) => {
  if (SAFE_DATA_IMAGE_URL_PREFIXES.some((prefix) => url.startsWith(prefix))) {
    return url;
  }
  return defaultUrlTransform(url);
};

const PENDING_MEDIA_PREFIX = "raven-media://";
const PENDING_MEDIA_TAGS = new Set(["img", "video", "audio", "iframe"]);

const isPendingMediaSrc = (src: unknown) =>
  typeof src === "string" && src.startsWith(PENDING_MEDIA_PREFIX);

/**
 * Replace media whose source is a not-yet-uploaded `raven-media://` ref with a
 * `<media-placeholder>` node. Must run before urlTransform (which would blank
 * the src) and before rehypeFigureActionButtons, so the figure gets no
 * expand/download buttons.
 */
function rehypePendingMedia() {
  return function (tree: HastRoot) {
    visit(tree, "element", (node, index, parent) => {
      if (!PENDING_MEDIA_TAGS.has(node.tagName) || !parent || index == null) {
        return CONTINUE;
      }
      // <video>/<audio> may carry the src on a child <source> instead
      const pending =
        isPendingMediaSrc(node.properties.src) ||
        node.children.some(
          (c) =>
            c.type === "element" &&
            c.tagName === "source" &&
            isPendingMediaSrc(c.properties.src)
        );
      if (!pending) return CONTINUE;

      parent.children[index] = {
        type: "element",
        tagName: "media-placeholder",
        properties: { dataKind: node.tagName },
        children: []
      };
      return SKIP;
    });
  };
}

// #endregion

// #region Component map for react-markdown

// Force playsInline so iOS plays videos inline instead of fullscreen on autoplay.
function MystVideo(props: ComponentProps<"video">) {
  return <video {...props} playsInline />;
}

// Stand-in for media still being uploaded (see rehypePendingMedia).
function MediaPlaceholder(props: { "data-kind"?: string }) {
  return (
    <Skeleton
      className={cn(
        "my-4 block rounded",
        props["data-kind"] === "audio" ? "h-14" : "aspect-video"
      )}
    />
  );
}

const components = {
  figure: MystFigure,
  div: MystDiv,
  span: MystSpan,
  button: MystActionButton,
  video: MystVideo,
  "media-placeholder": MediaPlaceholder
} as const;

const REMARK_REHYPE_OPTIONS = { allowDangerousHtml: true } as const;

// #endregion

interface MystRendererProps {
  myst: string;
  /** Normalize 2-space list indentation from TipTap to 4-space for CommonMark. */
  normalizeTiptapLists?: boolean;
  onRefUrlToNum?: (map: Map<string, number>) => void;
  publication?: Publication;
}

export default function MystRenderer(props: MystRendererProps) {
  const {
    myst,
    normalizeTiptapLists = false,
    onRefUrlToNum,
    publication
  } = props;
  const { references, social_posts_count: socialPostsCount } =
    publication || {};
  const containerRef = useRef<HTMLDivElement>(null);

  // Preprocess markdown
  const processedMyst = useMemo(() => {
    let result = normalizeEmphasisUnderscores(myst);
    if (normalizeTiptapLists) {
      result = normalizeListIndentation(result);
    }
    return result;
  }, [myst, normalizeTiptapLists]);

  // Build plugin arrays (memoized to avoid react-markdown re-processing)
  const refLinkOptionsState = useMemo(
    () => ({
      referenceUrlToText: new Map<string, string>(
        references?.map((ref) => [ref.url.toLowerCase(), ref.text])
      ),
      refUrlToNum: new Map<string, number>()
    }),
    [references]
  );
  const remarkPlugins = useMemo(() => {
    return [
      remarkGfm,
      remarkDirective,
      [
        remarkCustomDirective,
        { platform: Platform.Web, mediaAssets: publication?.mediaAssets }
      ] as const,
      remarkMath,
      remarkDemathifyAccidents,
      remarkHeadingId
    ];
  }, [publication?.mediaAssets]);

  const rehypePlugins = useMemo(
    () => [
      rehypeFileDownload,
      rehypeRaw,
      rehypePendingMedia,
      rehypeStripIframeSrcDoc,
      rehypeGistDataUriEmbed,
      [rehypeReferenceLinks, { state: refLinkOptionsState }] as const,
      rehypeMergeAdjacentLinks,
      rehypeImageSize,
      rehypeSlug,
      [rehypeSocial, { socialPostsCount: socialPostsCount ?? null }] as const,
      rehypeKatex,
      [rehypeExternalLinks, { target: "_blank" }] as const,
      [rehypeHighlight, { ignoreMissing: true }] as const,
      rehypeExtractFigureCaption,
      rehypeFigureCaptionWrapper,
      rehypeTableRowGroups,
      rehypeTableHeaderRows,
      rehypeTableEdgeCells,
      rehypeTableScrollWrapper,
      rehypeFigureActionButtons,
      rehypeBackmatter
    ],
    [socialPostsCount, refLinkOptionsState]
  );

  // Report the refUrlToNum mapping to the parent after render so it can
  // sort references by document-order appearance.
  const refUrlToNum = refLinkOptionsState.refUrlToNum;
  useEffect(() => {
    onRefUrlToNum?.(new Map(refUrlToNum));
  }, [onRefUrlToNum, refUrlToNum]);

  const { mystContextValue, lightbox } = useFigureActions(publication?.slug);

  // Memoize the Markdown output so react-markdown doesn't re-parse when
  // unrelated state (e.g. lightbox, selection) triggers a re-render. Without
  // this, every re-render rebuilds the DOM tree, which destroys any active
  // browser text selection inside dangerouslySetInnerHTML regions like
  // FigureLegend.
  const markdownOutput: ReactNode = useMemo(
    () => (
      <Markdown
        remarkPlugins={remarkPlugins as any}
        rehypePlugins={rehypePlugins as any}
        remarkRehypeOptions={REMARK_REHYPE_OPTIONS}
        components={components as any}
        urlTransform={urlTransform}
      >
        {processedMyst}
      </Markdown>
    ),
    [processedMyst, remarkPlugins, rehypePlugins]
  );

  return (
    <>
      <div ref={containerRef}>
        <MystProvider value={mystContextValue}>{markdownOutput}</MystProvider>
      </div>
      {lightbox}
    </>
  );
}
