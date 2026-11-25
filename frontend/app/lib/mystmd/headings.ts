import type { MdastNode } from "@/apiv1/mdast";
import type { Heading } from "@/types";

/** Containers whose headings stay out of the table of contents. */
const NESTED_CONTENT = new Set([
  "admonition",
  "details",
  "tabSet",
  "tabItem",
  "card",
  "grid",
  "aside",
  "container"
]);

/** The id a heading renders with; the table of contents links to it. */
export function headingId(node: Record<string, unknown>): string | undefined {
  const id = node.html_id ?? node.identifier;
  return typeof id === "string" ? id : undefined;
}

function plainText(node: MdastNode): string {
  if (typeof node.value === "string") return node.value;
  return (node.children ?? []).map(plainText).join("");
}

/** The children of the `block` Raven puts a part (`abstract`, `body`) in. */
export function partChildren(tree: MdastNode, part: string): MdastNode[] {
  const block = (tree.children ?? []).find(
    (child) =>
      child.type === "block" &&
      (child.data as { part?: string } | undefined)?.part === part
  );
  return block?.children ?? [];
}

/**
 * The id of the Purpose heading above the abstract: `purpose`, as in Google
 * Docs pubs, unless an element of the body already has it.
 */
export function purposeHeadingId(tree: MdastNode): string {
  const ids = new Set<string>();
  const visit = (node: MdastNode) => {
    const id = headingId(node);
    if (id) ids.add(id);
    (node.children ?? []).forEach(visit);
  };
  visit(tree);
  let id = "purpose";
  for (let n = 1; ids.has(id); n++) id = `purpose-${n}`;
  return id;
}

/**
 * The table of contents of a MyST publication: Purpose first when there is
 * an abstract, then the body's `##` and `###` headings, leaving out those
 * nested in admonitions, tabs, figures and the like. MyST keeps `#` for the
 * title, so a page's sections start at `##`; they are the first level here,
 * and a `#` in the body joins them. `hasChildren` is set as `extractHeadings`
 * sets it.
 */
export function headingsFromMdast(tree: MdastNode): Heading[] {
  const headings: Heading[] = [];
  const visit = (node: MdastNode) => {
    if (NESTED_CONTENT.has(node.type)) return;
    const depth = Number(node.depth);
    const id = headingId(node);
    if (node.type === "heading" && depth >= 1 && depth <= 3 && id) {
      headings.push({
        id,
        text: plainText(node).trim(),
        depth: Math.max(depth - 1, 1),
        hasChildren: false
      });
      return;
    }
    (node.children ?? []).forEach(visit);
  };
  partChildren(tree, "body").forEach(visit);

  headings.forEach((heading, i) => {
    const next = headings[i + 1];
    heading.hasChildren = Boolean(next && next.depth > heading.depth);
  });

  if (partChildren(tree, "abstract").length === 0) return headings;
  // Purpose stays childless, as in the Google Docs table of contents.
  // TODO: Make the heading above the abstract an org-level setting.
  return [
    {
      id: purposeHeadingId(tree),
      text: "Purpose",
      depth: 1,
      hasChildren: false
    },
    ...headings
  ];
}
