import DownloadIcon from "./icons/Download";
import ExpandIcon from "./icons/Expand";
import { fromHtml } from "hast-util-from-html";
import { h } from "hastscript";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import rehypeExternalLinks from "rehype-external-links";
import rehypeHighlight from "rehype-highlight";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import rehypeSlug from "rehype-slug";
import rehypeStringify from "rehype-stringify";
import remarkDirective from "remark-directive";
import remarkGfm from "remark-gfm";
import remarkHeadingId from "remark-heading-id";
import remarkMath from "remark-math";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import invariant from "tiny-invariant";
import { unified, type Processor } from "unified";
import {
  type Element,
  type Node,
  type Root as HastRoot,
  type Text,
} from "hast";
import { type Root as MdastRoot } from "mdast";
import { type Parent } from "unist";
import { CONTINUE, EXIT, SKIP, visit } from "unist-util-visit";
import { MediaAsset } from "./types";

// #region Local vars

export const CLASSES = {
  FIGURE_ACTION_BUTTONS: "figure-action-buttons",
  FIGURE_ACTION_BUTTON: "figure-action-btn",
  FIGURE_ACTION_TARGET: "figure-action-target",
  AUDIO_ACTION_TARGET: "audio-action-target",
  FIGURE_CAPTION_WRAPPER: "figure-caption-wrapper",
  FILE_DOWNLOAD_CONTAINER: "file-download-container",
} as const;

export const TABLE_EDGE_CLASSES = {
  TOP: "table-edge-top",
  BOTTOM: "table-edge-bottom",
  LEFT: "table-edge-left",
  RIGHT: "table-edge-right",
} as const;

export const DATA_ATTRS = {
  MEDIA_TYPE: "data-media-type",
  DIRECTIVE: "data-directive",
  FILE_FILENAME: "data-file-filename",
  FILE_SRC: "data-file-src",
  ASPECT_RATIO: "data-aspect-ratio",
  SIZED: "data-sized",
} as const;

export const MEDIA_TYPES = {
  AUDIO: "audio",
  FILE: "file",
  IFRAME: "iframe",
  IMAGE: "image",
  VIDEO: "video",
} as const;

/**
 * Returns a CSS width expression for percentage-sized figures.
 *
 * The computed width is capped so the figure never exceeds 100cqi.
 * @param widthAsFraction Requested width as a fraction (0–1).
 * @returns A CSS expression that limits the figure's width appropriately.
 */
export function proportionalFigureWidthExpression(
  widthAsFraction: number,
): string {
  return `min(calc(${widthAsFraction} * var(--figure-max-w)), 100cqi)`;
}

/**
 * Normalizes problematic underscore patterns in emphasis markup.
 *
 * Fixes two cases where underscore-based emphasis fails:
 *
 * 1. __ after closing HTML tags: Creates literal underscores instead of
 *    properly closing/opening emphasis because HTML tags disrupt boundary detection.
 *    Example: _h<sup>+</sup>__/h<sup>+</sup>_ → _h<sup>+</sup>/h<sup>+</sup>_
 *
 * 2. _text_ followed by non-ASCII letters or digits (like Greek letters): The parser
 *    treats Unicode letters as word characters, breaking the word boundary
 *    requirement for underscore emphasis.
 *    Example: _dea2_Δ → *dea2*Δ (converts to asterisk-based emphasis)
 */
export function normalizeEmphasisUnderscores(markdown: string): string {
  let result = markdown;

  // Fix 1: Pattern </tag>__ followed by non-whitespace, non-underscore
  // Remove the __ as it's likely unintended emphasis delimiter confusion
  result = result.replace(/<\/[^>]+>__(?=[^\s_])/g, (match) => {
    return match.slice(0, -2);
  });

  // Fix 2: Convert underscore emphasis to asterisk when followed by a
  // non-ASCII letter or digit (e.g., Greek letters like Δ), which breaks word
  // boundary detection. The span must stay on one line and start at an `_`
  // that can open emphasis, so a match can never begin at the closing `_` of
  // an earlier span (e.g. `(_n_, …` followed later by `_η_`). Non-ASCII
  // spaces and punctuation after the closing `_` (e.g. a non-breaking space
  // or an em dash) don't break emphasis, so they are left alone.
  result = result.replace(
    /(?<![\p{L}\p{N}_])_([^_\s][^_\n]*?)(?<!\s)_(?![\p{ASCII}])(?=[\p{L}\p{N}\p{M}])/gu,
    "*$1*",
  );

  return result;
}

/**
 * Normalizes list indentation in Markdown for CommonMark compatibility.
 *
 * TipTap's Markdown extension (via prosemirror-markdown) uses 2-space indentation
 * for nested lists, but CommonMark/GFM requires nested content to be indented to
 * align with the parent list item's content (3+ spaces for numbered lists).
 *
 * This function converts 2-space indentation to 4-space indentation.
 */
export function normalizeListIndentation(markdown: string): string {
  const lines = markdown.split("\n");
  const result: string[] = [];
  const twoSpaceIndent = / {2}/g;

  for (const line of lines) {
    // Match lines starting with 2-space indentation followed by a list marker
    const listMatch = line.match(/^((?:\s{2})+)([-*+]|\d+\.)\s/);
    if (listMatch) {
      const indent = listMatch[1];
      const rest = line.slice(indent.length);
      const newIndent = indent.replace(twoSpaceIndent, "    ");
      result.push(newIndent + rest);
    } else {
      // Also fix indentation for continuation lines under list items
      const indentMatch = line.match(/^((?:\s{2})+)(\S)/);
      if (indentMatch) {
        const indent = indentMatch[1];
        const rest = line.slice(indent.length);
        const newIndent = indent.replace(twoSpaceIndent, "    ");
        result.push(newIndent + rest);
      } else {
        result.push(line);
      }
    }
  }

  return result.join("\n");
}

// #endregion

// #region Exports

export enum Platform {
  Print = "print",
  Web = "web",
}

export function baseMarkdownToHtmlPipeline(
  platform: Platform,
  mediaAssets: MediaAsset[] | null = [],
) {
  const processorBase = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkDirective)
    .use(remarkCustomDirective, { platform, mediaAssets })
    .use(remarkMath)
    .use(remarkDemathifyAccidents)
    .use(remarkHeadingId)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeFileDownload)
    .use(rehypeRaw as any)
    .use(rehypeStripIframeSrcDoc);

  // The PDF capture path reads `iframe.src` and navigates to it directly to
  // screenshot it (see pdfGenerator.ts); `srcdoc` has no loadable URL there.
  if (platform === Platform.Web) {
    processorBase.use(rehypeGistDataUriEmbed);
  }

  return processorBase;
}

/**
 * @param data: Optional publication-related data used while constructing the HTML output
 */
export function mystToHtml({
  data,
  myst,
  normalizeTiptapLists = false,
  platform = Platform.Web,
  mediaAssets = [],
}: {
  data?: {
    referenceUrlToText?: Map<string, string>;
    socialPostsCount?: number | null;
  };
  myst: string;
  /** Normalize 2-space list indentation from TipTap to 4-space for CommonMark. */
  normalizeTiptapLists?: boolean;
  platform?: Platform;
  mediaAssets?: MediaAsset[] | null;
}): string {
  let { referenceUrlToText } = data || {};
  if (!referenceUrlToText) {
    referenceUrlToText = new Map<string, string>();
  }
  const socialPostsCount = data?.socialPostsCount ?? null;
  const refUrlToNum = new Map<string, number>();
  const refLinkOptionsState = {
    referenceUrlToText,
    refUrlToNum,
  };

  // Convert to HTML using unified pipeline
  const processor = baseMarkdownToHtmlPipeline(platform, mediaAssets)
    .use(rehypeReferenceLinks, { state: refLinkOptionsState })
    .use(rehypeMergeAdjacentLinks)
    .use(rehypeImageSize)
    .use(rehypeSlug as any)
    .use(rehypeSocial, { socialPostsCount })
    .use(rehypeKatex as any)
    .use(rehypeExternalLinks as any, { target: "_blank" })
    .use(rehypeHighlight as any, { ignoreMissing: true })
    .use(rehypeExtractFigureCaption)
    .use(rehypeFigureCaptionWrapper)
    .use(rehypeTableRowGroups)
    .use(rehypeTableHeaderRows)
    .use(rehypeTableEdgeCells)
    .use(rehypeTableScrollWrapper)
    .use(rehypeFigureActionButtons)
    .use(rehypeBackmatter)
    .use(rehypeStringify);

  return processMystSync(myst, processor, normalizeTiptapLists);
}

export function processMystSync<
  CompileTree extends HastRoot | undefined = HastRoot,
  CompileResult extends string | undefined = string,
>(
  myst: string,
  processor: Processor<MdastRoot, Node, HastRoot, CompileTree, CompileResult>,
  normalizeTiptapLists = false,
) {
  // Apply preprocessing normalizations
  let processedMyst = normalizeEmphasisUnderscores(myst);
  if (normalizeTiptapLists) {
    processedMyst = normalizeListIndentation(processedMyst);
  }
  return String(processor.processSync(processedMyst));
}

// #endregion

// #region Remark plugins

// Remark plugin to process custom directives
// Call after remarkDirective so that custom directives can be processed as MDAST nodes
export function remarkCustomDirective(options: {
  platform: Platform;
  mediaAssets?: MediaAsset[] | null;
}) {
  const { platform } = options;
  // `?? []` also covers null, which a destructuring default does not
  const mediaAssets = options.mediaAssets ?? [];

  return function (tree: any) {
    visit(tree, function (node, index, parent) {
      // Handle text directives (inline :name syntax)
      // Convert unrecognized text directives back to plain text to avoid broken HTML
      // e.g., "1:1:1" contains ":1" which gets parsed as a directive named "1"
      if (node.type === "textDirective") {
        if (parent && typeof index === "number") {
          // Reconstruct the original text: :name + [content] if any
          const name = node.name || "";

          // Helper to recursively extract text from MDAST nodes
          const extractText = (n: any): string => {
            if (n.type === "text") return n.value || "";
            if (n.children) return n.children.map(extractText).join("");
            return "";
          };

          let text = `:${name}`;

          // If there's content in brackets, include it
          if (node.children?.length) {
            const childText = extractText(node);
            if (childText) {
              text += `[${childText}]`;
            }
          }

          // Replace the directive node with a text node
          parent.children.splice(index, 1, { type: "text", value: text });
          return index;
        }
        return CONTINUE;
      }

      // Handle leaf directives (block ::name syntax)
      // Convert unrecognized leaf directives back to plain text
      if (node.type === "leafDirective") {
        if (parent && typeof index === "number") {
          const name = node.name || "";
          const text = `::${name}`;
          parent.children.splice(index, 1, {
            type: "paragraph",
            children: [{ type: "text", value: text }],
          });
          return index;
        }
        return CONTINUE;
      }

      if (node.type !== "containerDirective") {
        return CONTINUE;
      }

      const { name } = node;
      const attrs = node.attributes || {};

      // For directives that should become HTML elements, tell the parser how to convert them
      const htmlCustDirs = [
        "audio",
        "details",
        "div",
        "figcaption",
        "figure",
        "iframe",
        "image",
        "summary",
        "video",
      ];
      if (htmlCustDirs.includes(name)) {
        // Give the HAST node attrs that are relevant to all elements, like id and class
        const dataAttrs = Object.fromEntries(
          Object.entries(attrs).filter(([k]) => k.startsWith("data-")),
        );
        const hast: any = h(node.name, {
          id: attrs.id,
          class: attrs.class,
          ...dataAttrs,
        });
        const data = node.data || (node.data = {});
        data.hName = hast.tagName;
        data.hProperties = hast.properties;
      }

      // Handle bordered directive - convert to div with data attributes
      if (name === "bordered") {
        const dataAttrs = Object.fromEntries(
          Object.entries(attrs).filter(([k]) => k.startsWith("data-")),
        );
        const data = node.data || (node.data = {});
        data.hName = "div";
        data.hProperties = {
          id: attrs.id,
          className: attrs.class ? [attrs.class] : [],
          ...dataAttrs,
        };
        return CONTINUE;
      }

      // For directives that need additional processing, plug it in here
      switch (name) {
        case "audio":
          return processAudio(node);
        case "bibtex":
          // Remove bibtex directives from output; references are processed on the backend
          if (parent && typeof index === "number") {
            parent.children.splice(index, 1);
            return index;
          }
          return CONTINUE;
        case "details":
        case "summary":
          return processDetailsAndSummary(node);
        case "figcaption":
          return processFigcaption({ node, index: index!, parent });
        case "figure":
          return processFigure(node);
        case "file":
          return processFile(node);
        case "iframe":
          return processIframe(node);
        case "image":
          return processImage(node, mediaAssets);
        case "only":
          return process_Only_({ node, index: index!, parent, platform });
        case "video":
          return processVideo(node, mediaAssets);
        default:
          return CONTINUE;
      }
    });
  };
}

// Reverts accidental inline math like `$20k to $200k` to literal text.
export function remarkDemathifyAccidents() {
  return function (tree: any) {
    visit(tree, "inlineMath", function (node: any, index, parent) {
      if (typeof index !== "number" || !parent) return;

      // Real math should never end with whitespace
      if (!/\s$/.test(node.value)) return;

      parent.children[index] = {
        type: "text",
        value: `$${node.value}$`,
      };
    });
  };
}

// #endregion

// #region Remark plugins > MDAST node processors

function applySizingAttrs(node: any, size?: { height: number; width: number }) {
  // Sizing attr values are expected to include units
  const attrs = node.attributes || {};
  const hProps = node.data.hProperties;

  const styles: string[] = [];
  if (attrs.height) {
    styles.push(`height:${attrs.height}`);
  } else if (size) {
    styles.push(
      `--ratio-h:${size.height}`,
      `--ratio-w:${size.width}`,
      "aspect-ratio: var(--ratio-w) / var(--ratio-h);",
      "height: auto;",
    );
  }
  styles.push(...getWidthStyle(attrs));

  if (styles.length) hProps.style = styles.join(";");
}

function getWidthStyle(attrs: any): [string] | [] {
  if (attrs.width?.endsWith("%")) {
    const widthAsFraction = parseInt(attrs.width, 10) / 100;
    // Emit width:100% (not a calc) so rehype leaves it unsized and CSS keeps
    // the figure full-column width, matching iframe full-width handling.
    if (widthAsFraction === 1) {
      return ["width:100%"];
    } else {
      return [`width:${proportionalFigureWidthExpression(widthAsFraction)}`];
    }
  } else if (attrs.width) {
    return [`width:${attrs.width}`];
  }
  return [];
}

function processAudio(node: any) {
  // Transfer relevant node.attributes to node.data.hProperties
  const attrs = node.attributes || {};
  const hProps = node.data.hProperties;

  hProps.src = attrs.src;
  hProps.controls = "1";
  if (attrs.width) {
    hProps.style = `width:${attrs.width}`; // Attr value is expected to include a unit
  }

  return CONTINUE;
}

function processDetailsAndSummary(node: any) {
  // Expand the section by default if the "open" attr is present
  if (node.name === "details") {
    const attrs = node.attributes || {};
    const hProps = node.data.hProperties;

    if (attrs.open !== undefined) hProps.open = true;

    // Wrap all non-summary children in a div so details content can be styled as a block.
    if (Array.isArray(node.children) && node.children.length > 0) {
      const summaryChildren = node.children.filter(
        (child: any) =>
          child?.type === "containerDirective" && child?.name === "summary",
      );
      const nonSummaryChildren = node.children.filter(
        (child: any) =>
          !(child?.type === "containerDirective" && child?.name === "summary"),
      );

      // A details with no summary would show nothing but the browser's own
      // "Details" label, so give it a generic toggle row instead. The visitor
      // reaches it next and turns it into a <summary> like an authored one.
      if (summaryChildren.length === 0) {
        summaryChildren.push({
          type: "containerDirective",
          name: "summary",
          attributes: { class: "details-summary-fallback" },
          children: [{ type: "text", value: "Show more" }],
        });
      }

      if (nonSummaryChildren.length > 0) {
        const contentWrapper = {
          type: "divByDefault",
          data: {
            hName: "div",
            hProperties: { className: ["details-content-wrapper"] },
          },
          children: nonSummaryChildren,
        };
        const borderDiv = {
          type: "divByDefault",
          data: {
            hName: "div",
            hProperties: { className: ["details-content-border"] },
          },
          children: [contentWrapper],
        };

        node.children = [...summaryChildren, borderDiv];
      }
    }
  }

  return CONTINUE;
}

/**
 * Keeps only the first child in figcaption, moves the rest to a sibling
 * .figure-legend div. rehypeFigureCaptionWrapper later wraps both together
 * for image/video figures.
 */
function processFigcaption({
  node,
  index,
  parent,
}: {
  node: any;
  index: number;
  parent: any;
}) {
  node.data.hProperties.className = node.data.hProperties.className || [];
  node.data.hProperties.className.push("figure-caption");

  // Keep only the first child in figcaption.
  // Push the rest into a new sibling of figcaption: div.figure-legend
  if (node.children?.length > 1) {
    const figLegendNode = {
      type: "divByDefault",
      data: { hProperties: { className: ["figure-legend"] } },
      children: node.children.slice(1),
    };
    invariant(index !== null && index !== undefined);
    parent.children.splice(index + 1, 0, figLegendNode);

    node.children = [node.children[0]];
  }

  return CONTINUE;
}

function hasFullWidthIframe(figure: any): boolean {
  const iframe = figure.children?.find(
    (c: any) => c.type?.endsWith("Directive") && c.name === "iframe",
  );
  if (!iframe) return false;
  const width = iframe.attributes?.width;
  return !width || (width.endsWith("%") && parseInt(width, 10) >= 100);
}

// Process the "figure" MDAST subtree, notably by adding an "image" child
function processFigure(node: any) {
  // Transfer relevant node.attributes to node.data.hProperties
  const attrs = node.attributes || {};
  const hProps = node.data.hProperties;

  hProps.className = hProps.className || [];
  if (
    (attrs.align === "left" || attrs.align === "right") &&
    hasFullWidthIframe(node)
  ) {
    // A full-width iframe (no width, or 100%) has no definite width to float
    // at: inside a w-fit float its percentage would resolve against the
    // shrink-wrapped figure and collapse it. It could never leave a text
    // column beside it anyway, so keep the figure stacked at full width.
    return CONTINUE;
  }
  if (attrs.align === "center") {
    hProps.className.push("mx-auto");
  } else if (attrs.align === "left") {
    hProps.className.push("float-left", "mr-4");
  } else if (attrs.align === "right") {
    hProps.className.push("float-right", "ml-4");
  }

  return CONTINUE;
}

// Decorate the MDAST node with information that will be used by the Rehype plugin
function processFile(node: any) {
  const attrs = node.attributes || {};
  const { filename, src } = attrs;
  invariant(filename && src);

  // Set up data for rehype transformation
  const data = node.data || (node.data = {});
  data.hName = "div";
  data.hProperties = {
    className: ["info-box", CLASSES.FILE_DOWNLOAD_CONTAINER],
    [DATA_ATTRS.DIRECTIVE]: "file",
    [DATA_ATTRS.FILE_FILENAME]: filename,
    [DATA_ATTRS.FILE_SRC]: src,
  };

  // Clear children since rehype will build the content
  node.children = [];

  return CONTINUE;
}

function processIframe(node: any) {
  // Transfer relevant node.attributes to node.data.hProperties
  const attrs = node.attributes || {};
  const hProps = node.data.hProperties;

  hProps.src = attrs.src;
  if (attrs["aria-label"]) hProps["aria-label"] = attrs["aria-label"];

  // An iframe has no intrinsic width, so one without a width fills its
  // container. A width is sized like an image's, floated or not, and the
  // figure hugs it.
  const widthStyle = getWidthStyle(attrs);
  const styles: string[] = widthStyle.length ? widthStyle : ["width:100%"];

  // Handle aspect-ratio: apply CSS property and store as data attribute for lightbox
  if (attrs["aspect-ratio"]) {
    hProps[DATA_ATTRS.ASPECT_RATIO] = attrs["aspect-ratio"];
    styles.push(`aspect-ratio:${attrs["aspect-ratio"]}`);
  } else if (attrs.height) {
    styles.push(`height:${attrs.height}`);
  }

  hProps.style = styles.join(";");

  return CONTINUE;
}

function processImage(node: any, mediaAssets: MediaAsset[] = []) {
  // Transfer relevant node.attributes to node.data.hProperties
  const attrs = node.attributes || {};
  const hProps = node.data.hProperties;
  const { alt, src, srcset } = attrs;

  hProps.src = src;
  if (srcset) hProps.srcset = srcset;
  if (alt) hProps.alt = alt;

  const asset = mediaAssets.find((m) => m.publicUrl === src);

  applySizingAttrs(
    node,
    asset?.height && asset?.width
      ? { height: asset.height, width: asset.width }
      : undefined,
  );

  return CONTINUE;
}

function process_Only_({
  node,
  index,
  parent,
  platform,
}: {
  node: any;
  index: number;
  parent: any;
  platform: Platform;
}) {
  const nodePlatform = node.attributes?.platform;

  if (!nodePlatform || typeof nodePlatform !== "string") return CONTINUE;
  invariant(parent && typeof index === "number");

  if (nodePlatform.toLowerCase() === platform) {
    // Keep content, remove wrapper
    parent.children.splice(index, 1, ...node.children);
  } else {
    // Remove this directive entirely
    parent.children.splice(index, 1);
  }

  // Continue iteration from index
  return index;
}

/**
 * remark-directive parses every attribute value as a string: a bare `{loop}`
 * is `""` and `{loop=false}` is `"false"`. HTML boolean attributes are on
 * whenever present, so map these to real booleans before they reach hast.
 */
function isBooleanAttrOn(value: unknown) {
  return value === "" || value === "true";
}

function processVideo(node: any, mediaAssets: MediaAsset[] = []) {
  // Transfer relevant node.attributes to node.data.hProperties
  const attrs = node.attributes || {};
  const hProps = node.data.hProperties;

  hProps.src = attrs.src;

  const asset = mediaAssets.find((m) => m.publicUrl === attrs.src);

  applySizingAttrs(
    node,
    asset?.height && asset?.width
      ? { height: asset.height, width: asset.width }
      : undefined,
  );
  hProps.controls = hProps.muted = hProps.playsinline = true;
  if (isBooleanAttrOn(attrs.autoplay)) hProps.autoplay = true;
  if (isBooleanAttrOn(attrs.loop)) hProps.loop = true;

  return CONTINUE;
}

// #endregion

// #region Rehype plugins

/**
 * Strips `srcdoc` from `<iframe>` elements. It isn't a URL, so
 * `urlTransform` never sanitizes it. The `:::iframe` directive never sets
 * it, so this only strips attacker/author-authored raw HTML.
 */
export function rehypeStripIframeSrcDoc() {
  return function (tree: any) {
    visit(tree, "element", function (node) {
      if (node.tagName !== "iframe") return CONTINUE;
      if (node.properties) delete node.properties.srcDoc;
      return CONTINUE;
    });
  };
}

/**
 * Decodes a `data:text/html[;charset=...][;base64],<payload>` URI into its
 * HTML payload. Returns null if `src` isn't a `data:text/html` URI, or the
 * payload can't be decoded.
 */
function decodeDataHtmlUri(src: string): string | null {
  const match = src.match(
    /^data:text\/html(?:;charset=[^;,]+)?(;base64)?,([\s\S]*)$/i,
  );
  if (!match) return null;

  const [, isBase64, payload] = match;

  if (isBase64) {
    try {
      if (typeof Buffer !== "undefined") {
        return Buffer.from(payload, "base64").toString("utf-8");
      }
      const bytes = Uint8Array.from(atob(payload), (c) => c.charCodeAt(0));
      return new TextDecoder("utf-8").decode(bytes);
    } catch {
      return null;
    }
  }

  // Many hand-authored data: URIs aren't percent-encoded at all; fall back to
  // the raw payload rather than reject it.
  try {
    return decodeURIComponent(payload);
  } catch {
    return payload;
  }
}

/**
 * MIME types the HTML spec treats as a "classic script" `<script>` type,
 * plus `module`. A `type` outside this set (e.g. `application/json`) makes
 * the element an inert data block, not a script.
 */
const EXECUTABLE_SCRIPT_TYPES = new Set([
  "application/ecmascript",
  "application/javascript",
  "application/x-ecmascript",
  "application/x-javascript",
  "text/ecmascript",
  "text/javascript",
  "text/javascript1.0",
  "text/javascript1.1",
  "text/javascript1.2",
  "text/javascript1.3",
  "text/javascript1.4",
  "text/javascript1.5",
  "text/jscript",
  "text/livescript",
  "text/x-ecmascript",
  "text/x-javascript",
  "module",
]);

/** A missing/empty `type`, or one of {@link EXECUTABLE_SCRIPT_TYPES}, runs; anything else is inert. */
function isExecutableScriptType(type: unknown): boolean {
  if (type === undefined || type === null) return true;
  if (typeof type !== "string") return false;

  const trimmed = type.trim();
  return trimmed === "" || EXECUTABLE_SCRIPT_TYPES.has(trimmed.toLowerCase());
}

/**
 * Extracts a GitHub Gist embed script URL from an HTML snippet, or null.
 * Parses real HTML (not regex) so `data-src`, commented-out tags, and
 * non-executable `type`s (see {@link isExecutableScriptType}) don't match.
 */
function extractGistScriptUrl(html: string): string | null {
  const tree = fromHtml(html, { fragment: true });
  let found: string | null = null;

  visit(tree, "element", function (node) {
    if (node.tagName !== "script") return CONTINUE;
    if (!isExecutableScriptType(node.properties?.type)) return CONTINUE;

    const src = node.properties?.src;
    if (typeof src !== "string") return CONTINUE;

    let url: URL;
    try {
      url = new URL(src);
    } catch {
      return CONTINUE;
    }

    if (url.protocol !== "https:" || url.hostname !== "gist.github.com") {
      return CONTINUE;
    }
    if (!url.pathname.endsWith(".js")) return CONTINUE;

    found = url.href;
    return EXIT;
  });

  return found;
}

/**
 * Extracts the text content of the first `<style>` element in an HTML
 * snippet, or null if there isn't one.
 */
function extractAuthorStyle(html: string): string | null {
  const tree = fromHtml(html, { fragment: true });
  let found: string | null = null;

  visit(tree, "element", function (node) {
    if (node.tagName !== "style") return CONTINUE;

    const text = (node.children || [])
      .filter((c: any) => c.type === "text")
      .map((c: any) => c.value)
      .join("");
    if (!text.trim()) return CONTINUE;

    found = text;
    return EXIT;
  });

  return found;
}

/**
 * Renderer-owned CSS for the gist srcdoc: makes the file content the single
 * scroll region, sized to fill the iframe. Scoped to `:only-of-type` so a
 * multi-file gist isn't forced to the same height and stacked unreachably.
 */
const GIST_SRCDOC_STYLE = `
html, body { margin: 0; height: 100%; }
body:has(.gist-file:only-of-type) { overflow: hidden; }
.gist:has(.gist-file:only-of-type) { height: 100%; }
.gist .gist-file:only-of-type { height: 100%; display: flex; flex-direction: column; margin-bottom: 0 !important; }
.gist .gist-file:only-of-type .gist-data { flex: 1 1 auto; min-height: 0; max-height: none !important; overflow: auto !important; }
.gist .gist-file:only-of-type .file-header { position: sticky; top: 0; z-index: 1; }
.gist .gist-file:only-of-type .gist-meta { flex: 0 0 auto; }
`;

/**
 * Narrow carve-out rendering a `data:text/html` Gist embed in a sandboxed
 * srcdoc; the author's `<style>` (if any) is appended last so it wins the
 * cascade. Links like "Open in Colab" stay inert — revisit at MyST migration.
 */
export function rehypeGistDataUriEmbed() {
  return function (tree: any) {
    visit(tree, "element", function (node) {
      if (node.tagName !== "iframe") return CONTINUE;

      const src = node.properties?.src;
      if (typeof src !== "string") return CONTINUE;

      const html = decodeDataHtmlUri(src);
      if (!html) return CONTINUE;

      const gistUrl = extractGistScriptUrl(html);
      if (!gistUrl) return CONTINUE;

      const authorStyle = extractAuthorStyle(html);
      const authorStyleBlock = authorStyle
        ? `<style>${authorStyle}</style>`
        : "";

      delete node.properties.src;
      node.properties.srcDoc = `<style>${GIST_SRCDOC_STYLE}</style>${authorStyleBlock}<script src="${gistUrl}"></script>`;
      node.properties.sandbox = ["allow-scripts"];

      return CONTINUE;
    });
  };
}

/**
 * Extracts image size markers from alt text and applies them as data-size
 * attributes. This supports round-tripping the size attribute through Markdown
 * (set in the TipTap editor's ImageBubbleMenu).
 *
 * Example: `![photo{small}](url)` → `<img alt="photo" data-size="small" ...>`
 */
export function rehypeImageSize() {
  const SIZE_RE = /\{(small|medium|large)\}$/;

  return function (tree: any) {
    visit(tree, "element", function (node) {
      if (node.tagName !== "img") return CONTINUE;

      const alt = node.properties?.alt;
      if (typeof alt !== "string") return CONTINUE;

      const match = alt.match(SIZE_RE);
      if (!match) return CONTINUE;

      node.properties.alt = alt.replace(SIZE_RE, "").trim();
      node.properties["data-size"] = match[1];

      return CONTINUE;
    });
  };
}

export function rehypeFileDownload() {
  return function (tree: any) {
    visit(tree, "element", function (node) {
      const props = node.properties || {};

      if (props[DATA_ATTRS.DIRECTIVE] !== "file") return CONTINUE;

      const filename = props[DATA_ATTRS.FILE_FILENAME];
      const src = props[DATA_ATTRS.FILE_SRC];
      invariant(filename && src);

      // Build raw HTML for the HAST node, which will be processed by rehypeRaw
      node.children = [
        {
          type: "raw",
          value: `<div class="file-download-info">
              <span class="file-icon" aria-hidden="true">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <line x1="10" y1="9" x2="8" y2="9"></line>
                </svg>
              </span>
              <span class="file-name">${filename}</span>
            </div>
            <a href="${src}" download="${filename}" class="file-download-btn" aria-label="Download ${filename}">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 17V3"></path>
                <path d="m6 11 6 6 6-6"></path>
                <path d="M19 21H5"></path>
              </svg>
            </a>`,
        },
      ];

      // Clean up the data attributes we used for communication
      delete node.properties.dataDirective;
      delete node.properties.dataFileFilename;
      delete node.properties.dataFileSrc;

      return CONTINUE;
    });
  };
}

export function rehypeSocial(options: { socialPostsCount: number | null }) {
  const { socialPostsCount } = options;

  return function (tree: any) {
    visit(tree, "element", function (node, index, parent) {
      const props = node.properties || {};

      if (
        socialPostsCount === null ||
        node.tagName !== "h4" ||
        props.id !== "social" ||
        !parent ||
        index === null ||
        index === undefined
      )
        return CONTINUE;

      // Create a badge to show socialPostsCount
      const badgeEl = {
        type: "element",
        tagName: "span",
        properties: {
          className: [
            "rounded-full",
            "bg-caption-foreground",
            "text-white",
            "flex",
            "items-center",
            "justify-center",
            "text-[13px]",
            "font-mono",
            "h-[25px]",
            "w-[25px]",
          ],
        },
        children: [{ type: "text", value: String(socialPostsCount) }],
      };

      // Place the badge within the Social heading
      node.properties.className = node.properties.className || [];
      node.properties.className.push("inline-flex", "gap-4", "items-center");
      node.children.push(badgeEl);

      return CONTINUE;
    });
  };
}

/**
 * Parses figcaption text to extract "Figure X." or "Table X." labels.
 * Wraps the label in .table-caption-label and the rest in .table-caption-text
 * for consistent styling.
 */
export function rehypeExtractFigureCaption() {
  return function (tree: any) {
    visit(tree, "element", function (node) {
      if (node.tagName !== "figcaption") return CONTINUE;

      const getText = (n: any): string => {
        if (n.type === "text") return n.value;
        if (n.children) return n.children.map(getText).join("");
        return "";
      };

      const processNodes = (nodes: any[]): any[] => {
        if (nodes.length === 1 && nodes[0].tagName === "p") {
          nodes[0].children = processNodes(nodes[0].children);
          return nodes;
        }

        const newNodes: any[] = [];
        let foundLabel = false;
        const restNodes: any[] = [];

        for (let i = 0; i < nodes.length; i++) {
          const child = nodes[i];

          if (foundLabel) {
            restNodes.push(child);
            continue;
          }

          const text = getText(child);
          const labelMatch = text.match(
            /^((?:Table|Figure|Video)\s+\d+[.:])(\s+(.*))?$/,
          );

          if (labelMatch) {
            foundLabel = true;
            const labelText = labelMatch[1].replace(/:$/, ".");
            const restText = labelMatch[3];

            newNodes.push({
              type: "element",
              tagName: "span",
              properties: { className: ["caption-label"] },
              children: [{ type: "text", value: labelText + " " }],
            });

            if (restText) {
              restNodes.push({ type: "text", value: restText });
            }
          } else {
            newNodes.push(child);
          }
        }

        if (foundLabel && restNodes.length > 0) {
          newNodes.push({
            type: "element",
            tagName: "span",
            properties: { className: ["caption-text"] },
            children: restNodes,
          });
        }

        return foundLabel ? newNodes : nodes;
      };

      node.children = processNodes(node.children);

      return CONTINUE;
    });
  };
}

/**
 * Wraps tables in a scrollable container so captions don't scroll with the table.
 */
export function rehypeTableScrollWrapper() {
  return function (tree: any) {
    visit(tree, "element", function (node) {
      if (node.tagName !== "figure") return CONTINUE;

      const tableIndex = node.children?.findIndex(
        (c: any) => c.tagName === "table",
      );
      if (tableIndex === -1) return CONTINUE;

      const table = node.children[tableIndex];
      const wrapper = {
        type: "element",
        tagName: "div",
        properties: { className: ["table-scroll-wrapper"] },
        children: [table],
      };

      node.children[tableIndex] = wrapper;

      return CONTINUE;
    });
  };
}

/**
 * Generates a custom filename for downloads: {Type}-{n}_{slug}.{ext}
 * e.g. Figure-1_my-pub-slug.png
 */
export function generateCustomFilename(
  captionLabel: string | undefined | null,
  slug: string | undefined,
  src: string,
  _mediaType: string,
): string | undefined {
  if (!slug || !captionLabel) return undefined;

  const match = captionLabel.match(/(Figure|Video)\s+(\d+)/i);
  if (!match) return undefined;

  const type = match[1]; // Figure or Video
  const number = match[2]; // 1, 2, etc.

  // Get extension from src or default
  let ext = "";
  try {
    const urlPath = new URL(src).pathname;
    const parts = urlPath.split(".");
    if (parts.length > 1) ext = `.${parts.pop()}`;
  } catch {
    // ignore
  }

  return `${type}-${number}_${slug}${ext}`;
}

/**
 * Wraps figcaption + .figure-legend in a single .figure-caption-wrapper
 * for figures containing images or videos.
 *
 * Why: We use display:table on image figures so captions match image width,
 * but CSS only allows ONE table-caption element. This wrapper lets both
 * caption elements act as a single table-caption.
 */
export function rehypeFigureCaptionWrapper() {
  return function (tree: any) {
    visit(tree, "element", function (node) {
      if (node.tagName !== "figure") return CONTINUE;

      // Only process figures with images, videos, or iframes
      const hasMedia = node.children?.some(
        (c: any) =>
          c.tagName === "img" ||
          c.tagName === "video" ||
          c.tagName === "iframe",
      );
      if (!hasMedia) return CONTINUE;

      // Find figcaption and figure-legend indices
      const figcaptionIndex = node.children?.findIndex(
        (c: any) => c.tagName === "figcaption",
      );
      const legendIndex = node.children?.findIndex(
        (c: any) =>
          c.tagName === "div" &&
          c.properties?.className?.includes("figure-legend"),
      );

      if (figcaptionIndex === -1 && legendIndex === -1) return CONTINUE;

      // Collect elements to wrap
      const toWrap: any[] = [];
      const indicesToRemove: number[] = [];

      if (figcaptionIndex !== -1) {
        toWrap.push(node.children[figcaptionIndex]);
        indicesToRemove.push(figcaptionIndex);
      }
      if (legendIndex !== -1) {
        toWrap.push(node.children[legendIndex]);
        indicesToRemove.push(legendIndex);
      }

      if (toWrap.length === 0) return CONTINUE;

      // Create wrapper and replace original elements
      const wrapper = {
        type: "element",
        tagName: "div",
        properties: { className: [CLASSES.FIGURE_CAPTION_WRAPPER] },
        children: toWrap,
      };

      indicesToRemove.sort((a, b) => b - a);
      for (const idx of indicesToRemove) {
        node.children.splice(idx, 1);
      }

      node.children.push(wrapper);

      return CONTINUE;
    });
  };
}

/**
 * Detects "header rows" in table bodies - rows where all non-empty cells
 * contain bolded text. Adds .header-row class for styling.
 */
export function rehypeTableHeaderRows() {
  return function (tree: any) {
    visit(tree, "element", function (node) {
      if (node.tagName !== "tr") return CONTINUE;

      const cells = (node.children || []).filter(
        (c: any) => c.tagName === "td" || c.tagName === "th",
      );
      if (cells.length === 0) return CONTINUE;

      const isBolded = (cell: any): boolean => {
        const c = cell.children?.[0];
        if (!c) return false;
        if (c.tagName === "strong" || c.tagName === "b") return true;
        if (c.tagName === "p") {
          const inner = c.children?.[0];
          return inner?.tagName === "strong" || inner?.tagName === "b";
        }
        return false;
      };

      const getText = (n: any): string =>
        n.type === "text"
          ? n.value || ""
          : (n.children || []).map(getText).join("");

      const nonEmpty = cells.filter((c: any) => getText(c).trim() !== "");
      if (nonEmpty.length > 0 && nonEmpty.every(isBolded)) {
        node.properties = {
          ...node.properties,
          className: [...(node.properties?.className || []), "header-row"],
        };
      }

      return CONTINUE;
    });
  };
}

/**
 * Drops empty `<thead>`/`<tbody>`/`<tfoot>` groups and merges consecutive
 * `<tbody>` siblings. GDocs exports a stray `<tbody>` tag inside the first
 * row, which the HTML parser repairs into an empty row group, and Firefox
 * skips the collapsed borders of the rows around an empty group.
 */
export function rehypeTableRowGroups() {
  const isRowGroup = (node: any) =>
    node.type === "element" &&
    ["thead", "tbody", "tfoot"].includes(node.tagName);
  const hasRow = (group: any) =>
    (group.children || []).some(
      (c: any) => c.type === "element" && c.tagName === "tr",
    );

  return function (tree: any) {
    visit(tree, "element", function (node) {
      if (node.tagName !== "table") return CONTINUE;

      const children: any[] = [];
      let previousBody: any = null;
      for (const child of node.children || []) {
        if (!isRowGroup(child)) {
          children.push(child);
          continue;
        }
        if (!hasRow(child)) continue;
        if (child.tagName === "tbody" && previousBody) {
          previousBody.children.push(...child.children);
          continue;
        }
        previousBody = child.tagName === "tbody" ? child : null;
        children.push(child);
      }
      node.children = children;

      return CONTINUE;
    });
  };
}

/**
 * Marks cells on a table's outer edges. :first-child/:last-child can't, since a
 * cell spanning into the last row belongs to an earlier <tr>.
 */
export function rehypeTableEdgeCells() {
  // HTML spec caps.
  const MAX_ROW_SPAN = 65534;
  const MAX_COL_SPAN = 1000;

  const span = (value: unknown, max: number): number => {
    const n = typeof value === "number" ? value : parseInt(String(value), 10);
    if (!Number.isFinite(n) || n < 0) return 1;
    return Math.min(n, max);
  };

  return function (tree: any) {
    visit(tree, "element", function (node) {
      if (node.tagName !== "table") return CONTINUE;

      // Spans can't cross row groups, so lay out each group separately.
      let head: any[] | null = null;
      let foot: any[] | null = null;
      const body: any[][] = [];
      let looseRows: any[] | null = null;
      for (const child of node.children || []) {
        if (child.tagName === "tr") {
          if (!looseRows) body.push((looseRows = []));
          looseRows.push(child);
          continue;
        }
        if (!["thead", "tbody", "tfoot"].includes(child.tagName)) continue;
        const rows = (child.children || []).filter(
          (c: any) => c.tagName === "tr",
        );
        if (rows.length === 0) continue;
        looseRows = null;
        // The first thead/tfoot render at the top/bottom regardless of order.
        if (child.tagName === "thead" && !head) head = rows;
        else if (child.tagName === "tfoot" && !foot) foot = rows;
        else body.push(rows);
      }
      const groups = [
        ...(head ? [head] : []),
        ...body,
        ...(foot ? [foot] : []),
      ];

      const rowCount = groups.reduce((n, rows) => n + rows.length, 0);
      if (rowCount === 0) return CONTINUE;

      const placements: {
        cell: any;
        rowStart: number;
        rowEnd: number;
        colStart: number;
        colEnd: number;
      }[] = [];
      let columnCount = 0;
      let rowOffset = 0;

      for (const rows of groups) {
        const covered: number[] = [];

        rows.forEach((row, rowIndex) => {
          const cells = (row.children || []).filter(
            (c: any) => c.tagName === "td" || c.tagName === "th",
          );
          const rowsLeft = rows.length - rowIndex;
          let col = 0;

          for (const cell of cells) {
            while ((covered[col] || 0) > 0) col++;

            const colSpan = Math.max(
              1,
              span(cell.properties?.colSpan, MAX_COL_SPAN),
            );
            const declared = span(cell.properties?.rowSpan, MAX_ROW_SPAN);
            // rowspan="0" means "to the end of the group".
            const rowSpan =
              declared === 0 ? rowsLeft : Math.min(declared, rowsLeft);

            for (let c = col; c < col + colSpan; c++) covered[c] = rowSpan;

            placements.push({
              cell,
              rowStart: rowOffset + rowIndex,
              rowEnd: rowOffset + rowIndex + rowSpan - 1,
              colStart: col,
              colEnd: col + colSpan - 1,
            });

            col += colSpan;
            columnCount = Math.max(columnCount, col);
          }

          for (let c = 0; c < covered.length; c++) {
            if (covered[c] > 0) covered[c]--;
          }
        });

        rowOffset += rows.length;
      }

      for (const { cell, rowStart, rowEnd, colStart, colEnd } of placements) {
        const edges: string[] = [];
        if (rowStart === 0) edges.push(TABLE_EDGE_CLASSES.TOP);
        if (rowEnd >= rowCount - 1) edges.push(TABLE_EDGE_CLASSES.BOTTOM);
        if (colStart === 0) edges.push(TABLE_EDGE_CLASSES.LEFT);
        if (colEnd >= columnCount - 1) edges.push(TABLE_EDGE_CLASSES.RIGHT);
        if (edges.length === 0) continue;

        cell.properties = {
          ...cell.properties,
          className: [...(cell.properties?.className || []), ...edges],
        };
      }

      return CONTINUE;
    });
  };
}

/**
 * Adds hover action buttons to figures (with captions) and audio elements.
 * Only figures with figcaption get buttons. Buttons by media type:
 * - Images: download + expand
 * - Videos: download + expand
 * - iframes: expand only
 * - Audio (standalone): download only
 * - Tables: TODO
 */
export function rehypeFigureActionButtons() {
  // Helper to create HAST elements
  const el = (tag: string, props: any, children: any[] = []) => ({
    type: "element",
    tagName: tag,
    properties: props,
    children,
  });

  // Deep clone HAST nodes to avoid sharing nodes across multiple parents
  const cloneNodes = (nodes: any[]): any[] =>
    nodes.map((node) => {
      if (node.type === "text") {
        return { ...node };
      }
      return {
        ...node,
        properties: node.properties ? { ...node.properties } : undefined,
        children: node.children ? cloneNodes(node.children) : undefined,
      };
    });

  // Render icon components to static HTML strings
  const downloadIconHtml = renderToStaticMarkup(
    createElement(DownloadIcon, { width: 14, height: 14 }),
  );

  const expandIconHtml = renderToStaticMarkup(
    createElement(ExpandIcon, { width: 14, height: 14 }),
  );

  // Parse HTML into HAST nodes
  const downloadIconTemplate = fromHtml(downloadIconHtml, {
    fragment: true,
  }).children;
  const expandIconTemplate = fromHtml(expandIconHtml, {
    fragment: true,
  }).children;

  const createButtons = (options: { download?: boolean; expand?: boolean }) =>
    el(
      "div",
      { className: [CLASSES.FIGURE_ACTION_BUTTONS] },
      [
        options.download &&
          el(
            "button",
            {
              className: [CLASSES.FIGURE_ACTION_BUTTON],
              type: "button",
              "aria-label": "Download",
            },
            cloneNodes(downloadIconTemplate),
          ),
        options.expand &&
          el(
            "button",
            {
              className: [CLASSES.FIGURE_ACTION_BUTTON],
              type: "button",
              "aria-label": "Expand",
            },
            cloneNodes(expandIconTemplate),
          ),
      ].filter(Boolean),
    );

  // Depth-first search for the first descendant matching a predicate.
  const findDescendant = (n: any, pred: (c: any) => boolean): any => {
    if (!n.children) return null;
    for (const child of n.children) {
      if (pred(child)) return child;
      const found = findDescendant(child, pred);
      if (found) return found;
    }
    return null;
  };

  return function (tree: any) {
    visit(tree, "element", function (node, index, parent) {
      // Handle audio elements (not in figures)
      if (node.tagName === "audio" && parent?.tagName !== "figure") {
        const wrapper = el(
          "div",
          {
            className: [
              CLASSES.FIGURE_ACTION_TARGET,
              CLASSES.AUDIO_ACTION_TARGET,
            ],
          },
          [{ ...node }, createButtons({ download: true })],
        );
        if (parent && typeof index === "number") {
          parent.children[index] = wrapper;
        }
        return CONTINUE;
      }

      if (node.tagName !== "figure") return CONTINUE;
      if (!node.children) return CONTINUE;

      // Only add buttons to figures with captions
      const hasCaption = node.children.some(
        (c: any) =>
          c.tagName === "figcaption" ||
          (c.tagName === "div" &&
            c.properties?.className?.includes(CLASSES.FIGURE_CAPTION_WRAPPER)),
      );
      if (!hasCaption) return CONTINUE;

      // Skip tables
      // TODO: Add capability to download tables as CSV
      const hasTable = node.children.some((c: any) => c.tagName === "table");
      if (hasTable) return CONTINUE;

      // Find the media element and wrap it in an action target. The wrapper is
      // used by the expand/download handlers and for sizing; the buttons render
      // inside the caption below so they never cover the media or an embed's
      // own controls.
      const mediaTypes = ["img", "video", "iframe"] as const;
      let mediaType: string | null = null;
      for (const tag of mediaTypes) {
        const idx = node.children.findIndex((c: any) => c.tagName === tag);
        if (idx !== -1) {
          const target = node.children[idx];
          mediaType = tag === "img" ? "image" : tag;
          // Mark media sized narrower than full so its caption can track it.
          // width:100% (e.g. an iframe without a width) is full-width, not sized: excluding
          // it keeps such media at w-full instead of collapsing to w-fit.
          const widthMatch =
            typeof target.properties?.style === "string"
              ? target.properties.style.match(/(^|;)\s*width\s*:\s*([^;]+)/)
              : null;
          const hasExplicitWidth =
            !!widthMatch && widthMatch[2].trim() !== "100%";
          node.children[idx] = el(
            "div",
            {
              className: [CLASSES.FIGURE_ACTION_TARGET],
              [DATA_ATTRS.MEDIA_TYPE]: mediaType,
              ...(hasExplicitWidth ? { [DATA_ATTRS.SIZED]: "true" } : {}),
            },
            [target],
          );
          break;
        }
      }
      if (!mediaType) return CONTINUE;

      // Prepend the buttons to the caption wrapper (floated right via CSS) so
      // both the caption and the legend text wrap around them and the two stay
      // together. iframes are expand-only.
      const buttons =
        mediaType === "iframe"
          ? createButtons({ expand: true })
          : createButtons({ download: true, expand: true });

      const captionHost =
        findDescendant(
          node,
          (c: any) =>
            c.tagName === "div" &&
            c.properties?.className?.includes(CLASSES.FIGURE_CAPTION_WRAPPER),
        ) || findDescendant(node, (c: any) => c.tagName === "figcaption");
      if (captionHost) {
        captionHost.children = [buttons, ...(captionHost.children || [])];
      }

      return CONTINUE;
    });
  };
}

/**
 * Merges consecutive :::bordered directives with data-internal="acknowledgements"
 * (or the alternate spelling "acknowledgments") or "competing interests" into a
 * single backmatter container.
 */
export function rehypeBackmatter() {
  const BACKMATTER_INTERNALS = [
    "acknowledgements",
    "acknowledgments",
    "competing interests",
  ];

  const isBackmatterItem = (node: any): boolean => {
    if (node?.tagName !== "div") return false;
    const dataInternal =
      node.properties?.["data-internal"] || node.properties?.dataInternal;
    return (
      typeof dataInternal === "string" &&
      BACKMATTER_INTERNALS.includes(dataInternal.toLowerCase())
    );
  };

  const isWhitespaceText = (node: any): boolean => {
    return node?.type === "text" && !node.value?.trim();
  };

  return function (tree: any) {
    if (!tree.children || !Array.isArray(tree.children)) return;

    const newChildren: any[] = [];
    let i = 0;

    while (i < tree.children.length) {
      const child = tree.children[i];

      if (isBackmatterItem(child)) {
        // Collect all consecutive backmatter sections
        const subsections: any[] = [];

        while (i < tree.children.length) {
          // Skip whitespace text nodes
          while (
            i < tree.children.length &&
            isWhitespaceText(tree.children[i])
          ) {
            i++;
          }

          if (i >= tree.children.length) break;

          const current = tree.children[i];

          if (isBackmatterItem(current)) {
            // Convert the bordered div to a backmatter item
            subsections.push({
              type: "element",
              tagName: "div",
              properties: { className: ["backmatter-item"] },
              children: current.children || [],
            });
            i++;
          } else {
            break;
          }
        }

        // Wrap all items in a backmatter container
        newChildren.push({
          type: "element",
          tagName: "section",
          properties: { className: ["backmatter"] },
          children: subsections,
        });
        continue;
      }

      newChildren.push(child);
      i++;
    }

    tree.children = newChildren;
  };
}

/**
 * Returns true if a HAST `<a>` element is "blank" — a reference placeholder
 * like `[](url)` that has an href but no meaningful content.
 *
 * A reference placeholder is empty or whitespace-only. Anchors that wrap
 * element content (e.g. the icon-only file-download button, whose only child
 * is an SVG) are not references even though they hold no text, so they are
 * excluded here to avoid being rewritten into numbered reference badges.
 */
function isBlankAnchor(node: Element): boolean {
  if (node.tagName !== "a") return false;
  const href = node.properties?.href;
  if (typeof href !== "string" || !href) return false;

  const hasElementChild = node.children.some((c) => c.type === "element");
  if (hasElementChild) return false;

  const text = getAnchorTextContent(node).trim();
  return text.length === 0;
}

function getAnchorTextContent(node: Element | Text): string {
  if (node.type === "text") return node.value;
  if ("children" in node) {
    return (node.children as (Element | Text)[])
      .map((c) => getAnchorTextContent(c))
      .join("");
  }
  return "";
}

/**
 * Rehype plugin that converts blank `<a href="..."></a>` elements (both
 * markdown-origin and HTML-origin) into numbered reference link wrappers.
 * Adjacent blank anchors are merged into a single wrapper.
 *
 * Must run after rehypeRaw so raw HTML has been parsed into HAST, and before
 * rehypeExternalLinks so blank anchors aren't modified first.
 */
export function rehypeReferenceLinks(options: {
  state: {
    referenceUrlToText: Map<string, string>;
    refUrlToNum: Map<string, number>;
  };
}) {
  const { referenceUrlToText, refUrlToNum } = options.state;

  return function (tree: any) {
    refUrlToNum.clear();

    visit(tree, "element", function (node: Element, index, parent) {
      if (!isBlankAnchor(node) || index == null || !parent) return CONTINUE;

      const parentNode = parent as Parent;

      // Group adjacent blank <a> siblings, also merging across a single
      // whitespace or comma separator (e.g. `[](url1),[](url2)`).
      const group: Element[] = [node];
      let nextIdx = index + 1;
      while (nextIdx < parentNode.children.length) {
        const sibling = parentNode.children[nextIdx];
        if (sibling.type === "element" && isBlankAnchor(sibling as Element)) {
          group.push(sibling as Element);
          nextIdx++;
        } else if (
          sibling.type === "text" &&
          /^[\s,]$/.test((sibling as Text).value) &&
          nextIdx + 1 < parentNode.children.length
        ) {
          const afterSep = parentNode.children[nextIdx + 1];
          if (
            afterSep.type === "element" &&
            isBlankAnchor(afterSep as Element)
          ) {
            group.push(afterSep as Element);
            nextIdx += 2;
          } else {
            break;
          }
        } else {
          break;
        }
      }

      // Assign ref numbers and build linkInfos
      const linkInfos = group.map((n) => {
        const href = n.properties!.href as string;
        const url = href.toLowerCase();
        let refNum = refUrlToNum.get(url);
        if (!refNum) {
          refNum = refUrlToNum.size + 1;
          refUrlToNum.set(url, refNum);
        }
        const text = referenceUrlToText.get(url) || "";
        return { refNum, url: href, text };
      });

      // Build anchor children with comma separators
      const children: (Element | Text)[] = [];
      group.forEach((n, i) => {
        if (i > 0) children.push({ type: "text", value: "," } as Text);
        const info = linkInfos[i];
        children.push({
          type: "element",
          tagName: "a",
          properties: {
            href: info.url,
            className: ["ref-link-anchor"],
            title: info.text || undefined,
          },
          children: [{ type: "text", value: `${info.refNum}` }],
        } as Element);
      });

      const wrapper: Element = {
        type: "element",
        tagName: "span",
        properties: {
          className: ["ref-link-wrapper"],
          dataLinkInfos: JSON.stringify(linkInfos),
        },
        children,
      };

      // Replace trailing space before the group with non-breaking space
      if (index > 0) {
        const prevSibling = parentNode.children[index - 1] as Text;
        if (prevSibling.type === "text" && prevSibling.value.endsWith(" ")) {
          prevSibling.value = prevSibling.value.slice(0, -1) + "\u00A0";
        }
      }

      // Replace all consumed nodes (anchors + any separator text nodes)
      parentNode.children.splice(index, nextIdx - index, wrapper as any);
      return SKIP;
    });
  };
}

/**
 * Rehype plugin that merges consecutive `<a>` siblings pointing to the same
 * href (with identical attributes) into a single anchor, concatenating their
 * children.
 *
 * TipTap's markdown serializer (prosemirror-markdown) cannot nest a link mark
 * around an emphasis mark, so a link whose text contains an italic word is
 * written as several adjacent `[...](sameUrl)` links. CommonMark renders those
 * as separate `<a>` tags, which breaks the underline into segments and reads
 * as several distinct links. Stitching same-href neighbours back together
 * restores the single continuous link the author intended.
 *
 * Runs after rehypeReferenceLinks (so numbered reference anchors are already
 * wrapped and never merged here) and before rehypeExternalLinks (so rel/target
 * are applied once, to the merged anchor).
 */
export function rehypeMergeAdjacentLinks() {
  return function (tree: any) {
    visit(tree, "element", function (node: Element, index, parent) {
      if (node.tagName !== "a" || index == null || !parent) return CONTINUE;
      const href = node.properties?.href;
      if (typeof href !== "string" || !href) return CONTINUE;

      const parentNode = parent as Parent;
      const props = JSON.stringify(node.properties);

      // Pull in following siblings that are anchors with identical attributes,
      // absorbing a single run of whitespace-only text between them (that space
      // was part of the original link text, so it belongs inside the anchor).
      let nextIdx = index + 1;
      let pendingWhitespace: Text | null = null;
      while (nextIdx < parentNode.children.length) {
        const sibling = parentNode.children[nextIdx];
        const isMatchingAnchor =
          sibling.type === "element" &&
          (sibling as Element).tagName === "a" &&
          JSON.stringify((sibling as Element).properties) === props;

        if (isMatchingAnchor) {
          if (pendingWhitespace) {
            node.children.push(pendingWhitespace);
            pendingWhitespace = null;
          }
          node.children.push(...(sibling as Element).children);
          parentNode.children.splice(nextIdx, 1);
          continue;
        }

        if (
          sibling.type === "text" &&
          /^\s+$/.test((sibling as Text).value) &&
          !pendingWhitespace
        ) {
          pendingWhitespace = sibling as Text;
          parentNode.children.splice(nextIdx, 1);
          continue;
        }

        break;
      }

      // Consumed trailing whitespace but no further match followed: restore it.
      if (pendingWhitespace) {
        parentNode.children.splice(nextIdx, 0, pendingWhitespace);
      }

      return SKIP;
    });
  };
}

// #endregion
