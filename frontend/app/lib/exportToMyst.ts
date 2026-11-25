import type { Publication } from "@/types";
import rehypeStringify from "rehype-stringify";
import remarkDirective from "remark-directive";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import remarkStringify, { Options } from "remark-stringify";
import { unified } from "unified";
import { CONTINUE, visit } from "unist-util-visit";

// #region ---- Constants ----

const REMARK_STRINGIFY_OPTS: Options = {
  emphasis: "_",
  strong: "*",
  bullet: "-"
};

// Map of div classes to directive names
const CLASS_TO_DIRECTIVE: Record<string, string> = {
  "info-box": "callout",
  bordered: "bordered",
  "card-modern": "card"
};

// Pattern to match caption prefixes like "Figure 1:", etc.
const CAPTION_PREFIX_PATTERN = /^(Figure|Table|Video)\s+\d+:?\s*/i;

// #endregion

// #region ---- Exports ----

// Converts a publication to MyST format suitable for Google Docs import
export function publicationToMyst(publication: Publication): string {
  let myst = "";

  myst += `:::title\n\n${mystToGDocCompatibleMd(publication.title)}\n:::\n\n`;
  if (publication.subtitle)
    myst += `:::subtitle\n\n${mystToGDocCompatibleMd(publication.subtitle)}\n:::\n\n`;
  myst += `:::abstract\n\n${mystToGDocCompatibleMd(publication.abstract)}\n:::\n\n`;
  myst += `${mystToGDocCompatibleMd(publication.body)}\n`;

  return myst;
}

export async function savePublicationToDownloads(
  publication: Publication
): Promise<void> {
  const myst = publicationToMyst(publication);
  const filename = `${publication.slug}_v${publication.version_number}.md`;

  // Use File System Access API if available
  if ("showSaveFilePicker" in window) {
    try {
      const showSaveFilePicker = (window as any).showSaveFilePicker;
      const handle = await showSaveFilePicker({
        suggestedName: filename,
        types: [
          {
            description: "Markdown file",
            accept: { "text/markdown": [".md"] }
          }
        ]
      });
      const writable = await handle.createWritable();
      await writable.write(myst);
      await writable.close();
      return;
    } catch (err) {
      // User cancelled or API not supported, fall back to download
      if ((err as Error).name === "AbortError") {
        return;
      }
    }
  }

  // Fallback: create a download link
  const blob = new Blob([myst], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// #endregion

// #region ---- Remark Plugins ----

/**
 * Handle containerDirective: outputs :::name with colon-style attributes
 */
function handleContainerDirective(node: any, _: any, state: any): string {
  const name = node.name || "";
  const attrs = node.attributes || {};
  const children = node.children || [];

  // Build the directive
  let result = `:::${name}\n`;

  // Add attributes in colon-style format
  for (const [key, value] of Object.entries(attrs)) {
    if (value !== undefined && value !== null && value !== "") {
      result += `:${key}: ${value}\n\n`;
    }
  }

  // Add children content
  if (children.length > 0) {
    const childContent = state.containerFlow(node, {
      before: "\n",
      after: "\n"
    });
    if (childContent) {
      result += "\n" + childContent + "\n";
    }
  }

  result += ":::";

  return result;
}

/**
 * Handle leafDirective: outputs ::name with colon-style attributes
 */
function handleLeafDirective(node: any): string {
  const name = node.name || "";
  const attrs = node.attributes || {};

  let result = `::${name}`;

  // For leaf directives, keep inline format but simplified
  const attrParts: string[] = [];
  for (const [key, value] of Object.entries(attrs)) {
    if (value !== undefined && value !== null && value !== "") {
      attrParts.push(`${key}=${value}`);
    }
  }

  if (attrParts.length > 0) {
    result += `{${attrParts.join(" ")}}`;
  }

  return result;
}

/**
 * Handle textDirective: outputs :name with inline attributes
 */
function handleTextDirective(node: any, _: any, state: any): string {
  const name = node.name || "";
  const attrs = node.attributes || {};
  const children = node.children || [];

  let result = `:${name}`;

  // Build inline attributes
  const attrParts: string[] = [];
  if (attrs.id) {
    attrParts.push(`#${attrs.id}`);
  }
  for (const [key, value] of Object.entries(attrs)) {
    if (key !== "id" && value !== undefined && value !== null && value !== "") {
      attrParts.push(`${key}=${value}`);
    }
  }

  if (attrParts.length > 0) {
    result += `{${attrParts.join(" ")}}`;
  }

  // Add children content in brackets
  if (children.length > 0) {
    const childContent = state.containerPhrasing(node, {
      before: "[",
      after: "]"
    });
    result += `[${childContent}]`;
  }

  return result;
}

/**
 * Reverse :::div{.info-box} → :::callout, etc.
 */
function remarkCalloutsEtc() {
  return function (tree: any) {
    visit(tree, function (node) {
      if (node.type !== "containerDirective" || node.name !== "div") {
        return CONTINUE;
      }

      const attrs = node.attributes || {};
      const className = attrs.class || "";

      // Check each class mapping
      for (const [cls, directiveName] of Object.entries(CLASS_TO_DIRECTIVE)) {
        if (className.includes(cls)) {
          node.name = directiveName;
          // Remove the class attribute since it's now encoded in the directive name
          delete attrs.class;
          break;
        }
      }

      return CONTINUE;
    });
  };
}

/**
 * Custom stringify handlers for directives that output colon-style attributes.
 * Converts {key=value} inline format to :key: value on separate lines.
 */
function remarkColonStyleDirectives(this: any) {
  const data = this.data();

  // Add custom handlers for directive types
  const toMarkdownExtensions = data.toMarkdownExtensions || [];
  toMarkdownExtensions.push({
    handlers: {
      containerDirective: handleContainerDirective,
      leafDirective: handleLeafDirective,
      textDirective: handleTextDirective
    }
  });
  data.toMarkdownExtensions = toMarkdownExtensions;
}

/**
 * Convert empty links [](url) back to [:ref](url) for Google Docs.
 */
function remarkEmptyLinksToRef() {
  return function (tree: any) {
    visit(tree, function (node) {
      if (node.type !== "link" || !node.url) {
        return CONTINUE;
      }

      // Check if link has no children (empty link)
      const hasNoChildren =
        !node.children ||
        node.children.length === 0 ||
        (node.children.length === 1 &&
          node.children[0].type === "text" &&
          node.children[0].value === "");

      if (hasNoChildren) {
        // Add :ref text directive as child
        node.children = [
          {
            type: "textDirective",
            name: "ref",
            attributes: {},
            children: []
          }
        ];
      }

      return CONTINUE;
    });
  };
}

// :::figure + nested :::image/video/table + :::figcaption → :::media
function remarkFigureToMedia() {
  return function (tree: any) {
    visit(tree, function (node, index, parent) {
      if (
        node.type !== "containerDirective" ||
        node.name !== "figure" ||
        !parent ||
        typeof index !== "number"
      )
        return CONTINUE;

      const figureAttrs = node.attributes || {};
      let childAttrs: Record<string, any> = {};
      let captionChildren: any[] = [];
      const contentChildren: any[] = [];

      // Check if this is a table based on type attribute
      const isTable = figureAttrs.type === "table";

      // Extract children: figcaption vs content
      for (const child of node.children || []) {
        if (child.type === "containerDirective") {
          if (child.name === "figcaption") {
            captionChildren = stripCaptionPrefix(child.children || []);
          } else if (
            ["file", "iframe", "image", "video"].includes(child.name)
          ) {
            // Extract attributes of the nested element
            childAttrs = { ...childAttrs, ...(child.attributes || {}) };
          } else {
            // Other directives go to content
            contentChildren.push(child);
          }
        } else {
          // Non-directive children (like table markdown) go to content
          contentChildren.push(child);
        }
      }

      if (isTable) {
        // For tables: remove figure wrapper, keep table content, add :::meta for caption/attrs
        const metaAttrs: Record<string, any> = {};

        // Move these attributes to meta
        const attrsToCopy = ["id", "width", "align", "alt", "title"];
        for (const attr of attrsToCopy) {
          if (figureAttrs[attr]) metaAttrs[attr] = figureAttrs[attr];
          if (childAttrs[attr]) metaAttrs[attr] = childAttrs[attr];
        }

        // Build replacement nodes: table content + :::meta
        const replacementNodes: any[] = [...contentChildren];

        // Add meta directive if there's caption or attributes
        if (captionChildren.length > 0 || Object.keys(metaAttrs).length > 0) {
          const metaNode = {
            type: "containerDirective",
            name: "meta",
            attributes: metaAttrs,
            children: captionChildren
          };
          replacementNodes.push(metaNode);
        }

        // Replace figure node with table content + meta
        parent.children.splice(index, 1, ...replacementNodes);
        return index; // Revisit this index since we replaced nodes
      }

      // Check if this is a standalone iframe (twitter/typeform embeds)
      const allAttrs = { ...figureAttrs, ...childAttrs };
      if (
        figureAttrs.type === "iframe" &&
        isStandaloneIframe(allAttrs.src as string)
      ) {
        // Convert to standalone :::iframe directive
        node.name = "iframe";
        node.attributes = allAttrs;
        delete node.attributes.type;
        node.children = captionChildren;
        return CONTINUE;
      }

      // For non-tables: convert to media directive
      node.name = "media";
      node.attributes = allAttrs;
      node.children = captionChildren;

      // Normalize attribute values
      if (node.attributes.type === "img") node.attributes.type = "image";

      return CONTINUE;
    });
  };
}

/**
 * Wrap HTML tables in a code block with language "thestacks-table-html".
 * The code block will have escaped backticks so GDocs preserves them.
 * Also adds data-ts-import-behavior="preserve" so import knows to keep as HTML.
 */
function remarkHtmlTablesToCodeBlock() {
  return function (tree: any) {
    visit(tree, function (node) {
      if (node.type !== "html" || !node.value?.includes("<table"))
        return CONTINUE;

      // Add a marker that tells the GDoc importer to not convert
      // this table to Markdown
      node.value = node.value.replace(
        /<table/,
        '<table data-ts-import-behavior="preserve"'
      );

      // Convert to a code block with special language marker
      node.type = "code";
      node.lang = "thestacks-table-html";
      node.meta = null;

      return CONTINUE;
    });
  };
}

/**
 * Convert complex Markdown tables to HTML.
 * GDocs messes up such tables; the pub will be broken when we import the GDoc.
 * To avoid this, we produce HTML, and simply use that HTML when the GDoc is imported.
 * The downside is that the table won't render in GDocs.
 *
 * Complex tables are those containing images (in Markdown or HTML syntax),
 * or those with spanning rows/cols.
 */
function remarkMarkdownTablesToHtmlTables() {
  return function (tree: any) {
    visit(tree, function (node) {
      if (node.type !== "table") return CONTINUE;

      // Check if table contains any images (Markdown or HTML)
      let hasImages = false;
      visit(node, (child: any) => {
        if (
          child.type === "image" ||
          (child.type === "html" && child.value?.includes("<img"))
        )
          hasImages = true;
      });

      if (!hasImages) return CONTINUE;

      // Convert table to HTML
      const html = tableNodeToHtml(node);

      // Replace table node with HTML node
      node.type = "html";
      node.value = html;
      delete node.children;
      delete node.align;

      return CONTINUE;
    });
  };
}

// Convert standalone :::image, :::video, :::iframe, :::file directives to :::media
function remarkStandaloneMediaToMedia() {
  const mediaTypes = ["file", "iframe", "image", "video"];

  return function (tree: any) {
    visit(tree, function (node) {
      if (node.type !== "containerDirective" || !mediaTypes.includes(node.name))
        return CONTINUE;

      // Skip standalone iframes (twitter/typeform embeds)
      if (
        node.name === "iframe" &&
        isStandaloneIframe(node.attributes?.src as string)
      )
        return CONTINUE;

      // Convert to media directive with type attribute
      const originalName = node.name;
      node.name = "media";
      node.attributes = node.attributes || {};
      node.attributes.type = originalName;

      return CONTINUE;
    });
  };
}

// Convert a markdown table AST node to an HTML table string
function tableNodeToHtml(tableNode: any): string {
  const processor = unified()
    .use(remarkGfm)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeStringify, { allowDangerousHtml: true });

  const tree = { type: "root" as const, children: [tableNode] };
  return String(processor.stringify(processor.runSync(tree)));
}

// #endregion

// #region ---- Other helpers ----

/**
 * Surround directive fences (:::word) with newlines for Google Docs compatibility.
 */
function clarifyContainerDirectives(myst: string): string {
  return myst
    .replace(/([^\n])(\n)(:::\w+)/g, "$1\n\n$3") // Blank line before directive opening
    .replace(/([^\n])(\n)(:::)(\s*)$/gm, "$1\n\n$3$4") // Blank line before directive closing
    .replace(/^(:::\w+)(\n)([^\n])/gm, "$1\n\n$3") // Blank line after directive opening
    .replace(/^(:::)(\s*)(\n)([^\n])/gm, "$1$2\n\n$4"); // Blank line after directive closing
}

/**
 * Escape backticks in code fences so Google Docs doesn't strip them.
 * Skip thestacks-table-html blocks (they should remain unescaped).
 * Also ensure blank lines before and after escaped code fences.
 */
function escapeCodeFences(myst: string): string {
  const lines = myst.split("\n");
  const result: string[] = [];
  let inThestacksHtml = false;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    const fenceMatch = line.match(/^(`{3,})([\w-]*)\s*$/);

    if (fenceMatch) {
      const [, backticks, lang] = fenceMatch;

      if (lang === "thestacks-table-html") {
        // Opening thestacks-table-html fence - don't escape
        inThestacksHtml = true;
        result.push(line);
      } else if (inThestacksHtml && !lang) {
        // Closing fence for thestacks-table-html - don't escape
        inThestacksHtml = false;
        result.push(line);
      } else {
        // Other code fence - escape
        line = "\\" + backticks + lang;

        if (lang) {
          // Opening fence - blank line before and after
          if (result.length > 0 && result[result.length - 1] !== "") {
            result.push("");
          }
          result.push(line);
          if (i + 1 < lines.length && lines[i + 1] !== "") {
            result.push("");
          }
        } else {
          // Closing fence - blank line before and after
          if (result.length > 0 && result[result.length - 1] !== "") {
            result.push("");
          }
          result.push(line);
          if (i + 1 < lines.length && lines[i + 1] !== "") {
            result.push("");
          }
        }
      }
    } else {
      result.push(line);
    }
  }

  return result.join("\n");
}

// Check if an iframe src should remain as :::iframe (not converted to :::media)
function isStandaloneIframe(src: string | undefined): boolean {
  if (!src) return false;

  const STANDALONE_IFRAME_URL_PREFIXES = [
    "https://publishing-tools.arcadiascience.com/twitter",
    "https://publishing-tools.arcadiascience.com/typeform"
  ];

  return STANDALONE_IFRAME_URL_PREFIXES.some((prefix) =>
    src.startsWith(prefix)
  );
}

function mystToGDocCompatibleMd(myst: string): string {
  if (!myst) return "";

  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkDirective)
    .use(remarkMarkdownTablesToHtmlTables)
    .use(remarkFigureToMedia) // Process figures first to extract meta
    .use(remarkHtmlTablesToCodeBlock) // Then wrap HTML tables in code blocks
    // .use(remarkDebugTree)
    .use(remarkStandaloneMediaToMedia)
    .use(remarkCalloutsEtc)
    .use(remarkEmptyLinksToRef)
    .use(remarkStringify, REMARK_STRINGIFY_OPTS)
    .use(remarkColonStyleDirectives);

  const result = processor.processSync(myst);
  let output = String(result);

  // Post-process for Google Docs compatibility
  output = clarifyContainerDirectives(output);
  output = escapeCodeFences(output);
  output = formatMathBlocks(output);

  return output;
}

/**
 * Ensure math blocks have $$ on their own lines with proper newlines.
 * Converts: $$ content $$ → $$\n\ncontent\n\n$$
 */
function formatMathBlocks(myst: string): string {
  // Match math blocks: $$ ... $$
  return myst.replace(/\$\$\s*([^$]+?)\s*\$\$/g, (match, content) => {
    // Ensure $$ are on their own lines
    return `$$\n\n${content.trim()}\n\n$$`;
  });
}

/** Remove "**Figure 1:**", "**Table 2:**", etc. from caption nodes */
function stripCaptionPrefix(children: any[]): any[] {
  if (!children || children.length === 0) return children;

  // Process paragraph wrapper if present
  if (children[0]?.type === "paragraph" && children[0].children) {
    stripCaptionPrefix(children[0].children);
    return children;
  }

  // Check if first child is a strong/bold node with the prefix pattern
  const first = children[0];
  if (first?.type === "strong" && first.children?.[0]?.type === "text") {
    const text = first.children[0].value || "";
    if (CAPTION_PREFIX_PATTERN.test(text)) {
      // Remove the entire strong node containing the prefix
      children.shift();
      // Also remove leading whitespace from next text node
      if (children[0]?.type === "text") {
        children[0].value = children[0].value.replace(/^\s+/, "");
      }
      return children;
    }
  }

  // Fallback: check for plain text prefix
  if (first?.type === "text" && typeof first.value === "string") {
    first.value = first.value.replace(CAPTION_PREFIX_PATTERN, "");
  }

  return children;
}

// function remarkDebugTree() {
//   return function (tree: any) {
//     console.info(JSON.stringify(tree, null, 2));
//   };
// }

// #endregion
