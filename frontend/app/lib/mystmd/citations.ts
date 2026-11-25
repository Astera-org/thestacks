import type { MdastNode } from "@/apiv1/mdast";

/**
 * The reference URL a `cite` is labelled with. Raven labels a citation of a
 * bibliography entry that has neither a DOI nor a URL with its citation key
 * instead, which is not a link.
 */
export function citeUrl(label: unknown): string | undefined {
  if (typeof label !== "string") return undefined;
  return /^https?:\/\//i.test(label) ? label : undefined;
}

/**
 * The formatted text Raven gives each `cite` of a bibliography entry, by the
 * identifier `citations.order` lists it under. Entries without a URL have no
 * row in the publication's `references`, so this is their only text.
 */
export function citationTextByIdentifier(tree: MdastNode): Map<string, string> {
  const texts = new Map<string, string>();
  const visit = (node: MdastNode) => {
    if (
      node.type === "cite" &&
      typeof node.identifier === "string" &&
      typeof node.citationText === "string"
    ) {
      texts.set(node.identifier, node.citationText);
    }
    (node.children ?? []).forEach(visit);
  };
  visit(tree);
  return texts;
}
