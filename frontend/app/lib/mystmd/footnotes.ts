import type { GenericNode, GenericParent } from "myst-common";

export interface Footnotes {
  /** The numbered definitions, in number order. */
  definitions: GenericNode[];
  /** The key of each footnote's first reference, by identifier. */
  firstReferenceKey: ReadonlyMap<string, string>;
}

export const NO_FOOTNOTES: Footnotes = {
  definitions: [],
  firstReferenceKey: new Map()
};

export function collectFootnotes(tree: GenericParent): Footnotes {
  const definitions: GenericNode[] = [];
  const firstReferenceKey = new Map<string, string>();
  const visit = (node: GenericNode) => {
    // A definition is numbered only when the text references it; unreferenced
    // ones are left out, as GitHub leaves them out.
    if (node.type === "footnoteDefinition" && node.enumerator != null) {
      definitions.push(node);
    }
    if (
      node.type === "footnoteReference" &&
      !firstReferenceKey.has(String(node.identifier))
    ) {
      firstReferenceKey.set(String(node.identifier), String(node.key));
    }
    (node.children ?? []).forEach(visit);
  };
  visit(tree);
  definitions.sort((a, b) => Number(a.enumerator) - Number(b.enumerator));
  return { definitions, firstReferenceKey };
}
