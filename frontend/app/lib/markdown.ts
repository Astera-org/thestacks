import { Heading } from "@/types";
import GithubSlugger from "github-slugger";
import type { Root } from "mdast";
import rehypeSlug from "rehype-slug";
import rehypeStringify from "rehype-stringify";
import remarkDirective from "remark-directive";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import remarkStringify from "remark-stringify";
import stripMarkdown from "strip-markdown";
import { unified } from "unified";
import toString from "unist-util-to-string-with-nodes";
import { SKIP, visit } from "unist-util-visit";

function markdownToHtmlPipeline() {
  return unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype)
    .use(rehypeSlug)
    .use(rehypeStringify);
}

export async function markdownToHtml(markdown: string) {
  const result = await markdownToHtmlPipeline().process(markdown);
  return result.toString();
}

export function markdownToHtmlSync(markdown: string) {
  const result = markdownToHtmlPipeline().processSync(markdown);
  return result.toString();
}

function markdownToAnchorSafeHtmlPipeline() {
  return unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(stripMarkdown, { keep: ["emphasis", "strong", "text"] })
    .use(remarkRehype)
    .use(rehypeStringify);
}
/**
 *
 * @param markdown Return an HTML string that can be the child of an anchor.
 * @returns
 */
export async function markdownToAnchorSafeHtml(markdown: string) {
  const result = await markdownToAnchorSafeHtmlPipeline().process(markdown);
  return result.toString();
}

/**
 *
 * @param markdown Synchronously return an HTML string that can be the child of an anchor.
 * @returns
 */
export function markdownToAnchorSafeHtmlSync(markdown: string) {
  const result = markdownToAnchorSafeHtmlPipeline().processSync(markdown);
  return result.toString();
}

function markdownToTextPipeline() {
  return unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(stripMarkdown)
    .use(remarkStringify, {
      // Bypass the default `text` handler so literal characters like `_` or
      // `*` in the source text aren't backslash-escaped as they would be for
      // valid Markdown output.
      handlers: { text: (node: { value: string }) => node.value }
    });
}

function finalizeMarkdownToText(result: { toString(): string }): string {
  return (
    result
      .toString()
      // Non-breaking spaces (e.g. used to glue italicized species names like
      // "C. elegans" together) aren't Markdown syntax, so the strip pipeline
      // leaves them as-is. Normalize them to regular spaces so downstream
      // plain-text consumers (search indexing, truncation, citation tooling,
      // exact-string matching against DataCite/Crossref records) see genuine
      // plain text rather than an invisible non-breaking character.
      .replace(/\u00A0/g, " ")
      .trim()
      .normalize("NFC")
  );
}

export async function markdownToText(markdown: string) {
  if (!markdown) return markdown;
  const result = await markdownToTextPipeline().process(markdown);
  return finalizeMarkdownToText(result);
}

export function markdownToTextSync(markdown: string) {
  if (!markdown) return markdown;
  const result = markdownToTextPipeline().processSync(markdown);
  return finalizeMarkdownToText(result);
}

/**
 * Returns an array of `Heading` objects from the given Markdown content.
 */
export function extractHeadings(markdown: string): Heading[] {
  const headings: Heading[] = [];
  const slugger = new GithubSlugger();
  const processor = unified().use(remarkParse).use(remarkDirective);
  const ast = processor.runSync(processor.parse(markdown)) as Root;

  visit(ast, (node) => {
    const { type } = node;

    if (
      type === "containerDirective" &&
      node.attributes?.class?.includes("bordered")
    ) {
      // Don't look for headings in bordered boxes.
      return SKIP;
    }

    if (node.type === "heading") {
      const { depth, children } = node;

      if (depth >= 1 && depth <= 2 && children && children.length > 0) {
        // Extract raw markdown using children's position offsets.
        const firstChild = children[0];
        const lastChild = children[children.length - 1];
        let text = markdown.slice(
          firstChild.position!.start.offset,
          lastChild.position!.end.offset
        );

        // Check for explicit ID: ## Heading {#id}
        // Only match {#...} pattern to avoid matching regular {curly braces}
        const idMatch = text.match(/\s*\{#([\w.-]+)\}\s*$/);
        let id: string;
        if (idMatch) {
          id = idMatch[1];
          text = text.replace(/\s*\{#[\w.-]+\}\s*$/, "").trim();
        } else {
          // Use plain text for the slug (keeps IDs URL-friendly).
          const plainText = toString(node).text.trim();
          id = slugger.slug(plainText);
        }

        headings.push({ depth, id, text, hasChildren: false });
      }
    }
  });

  // Determine which headings have children.
  for (let i = 0; i < headings.length; i++) {
    const current = headings[i];
    const next = headings[i + 1];

    // A heading has children if the next heading has a greater depth.
    if (next && next.depth > current.depth) {
      current.hasChildren = true;
    }
  }

  return headings;
}
