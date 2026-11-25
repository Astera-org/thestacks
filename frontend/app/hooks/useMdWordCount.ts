import { toString } from "mdast-util-to-string";
import { useMemo } from "react";
import remarkDirective from "remark-directive";
import remarkMath from "remark-math";
import remarkParse from "remark-parse";
import { unified } from "unified";
import { visit } from "unist-util-visit";

const SKIP_TYPES = new Set([
  "yaml",
  "code",
  "inlineCode",
  "math",
  "inlineMath",
  "html",
  "mystTarget"
]);

const EXCLUDED_DIRECTIVES = new Set(["bibtex", "image"]);

function pruneNonProse(tree: any) {
  visit(tree, (node, index, parent) => {
    if (!parent || index === null) return;

    const isDirective =
      node.type === "containerDirective" ||
      node.type === "leafDirective" ||
      node.type === "textDirective";

    if (isDirective && EXCLUDED_DIRECTIVES.has(node.name)) {
      parent.children.splice(index, 1);
      return ["skip", index];
    }

    // Collapse formulae to exactly one "word" instead of stripping them
    if (node.type === "math" || node.type === "inlineMath") {
      parent.children.splice(index, 1, { type: "text", value: " FORMULA " });
      return ["skip", index];
    }

    if (SKIP_TYPES.has(node.type)) {
      parent.children.splice(index, 1);
      return ["skip", index];
    }
  });
  return tree;
}

const wordCountParser = unified()
  .use(remarkParse)
  .use(remarkMath)
  .use(remarkDirective);

function getWordCount(markdownList: string[]) {
  let totalWordCount = 0;
  for (const markdown of markdownList) {
    const ast = wordCountParser.parse(markdown);
    const prose = toString(pruneNonProse(structuredClone(ast)));
    const tokens = prose
      .trim()
      .split(/\s+/)
      .filter((token) => /[\p{L}\p{N}]/u.test(token));
    const count = tokens.length;
    totalWordCount += count;
  }
  return totalWordCount;
}

export function useMdWordCount(...markdownList: string[]) {
  // The rest args are a new array on every render, so key on the contents.
  const key = JSON.stringify(markdownList);
  return useMemo(() => getWordCount(JSON.parse(key) as string[]), [key]);
}
