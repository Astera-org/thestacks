import type { MdastMessage, MdastNode, PublicationMdast } from "@/apiv1/mdast";
import type { GenericNode, GenericParent } from "myst-common";
import { mystParse } from "myst-parser";
import {
  basicTransformations,
  codeTransform,
  enumerateTargetsTransform,
  footnotesTransform,
  glossaryTransform,
  inlineMathSimplificationTransform,
  ReferenceState,
  resolveLinksAndCitationsTransform,
  resolveReferencesTransform
} from "myst-transforms";
// The myst-* packages are on unified 10, so vfile 5; the rest of the frontend
// is on vfile 6.
import { VFile } from "vfile-5";
import { MDAST_SCHEMA_VERSION, MYST_AST_VERSION } from "./versions";

/**
 * Builds the MyST AST of a site page (such as About) from MyST Markdown kept
 * in this repo, in the shape `MystmdRenderer` renders: the content in a
 * `block` with `data.part` `"body"`.
 *
 * Publications' ASTs come from Raven; this is the exception for pages that
 * are not publications (see the `initial-myst-support` skill). It follows
 * Raven's `buildPublicationMdast`, without what only publications need:
 * citations and bibliographies, the `myst-ext-*` directives, an abstract, and
 * line numbers for messages. Server only, so readers never download the
 * parser.
 */
export function buildSitePageMdast(source: string): PublicationMdast {
  const file = new VFile();
  const parsed = mystParse(source, { vfile: file }) as GenericParent;
  // No firstDepth, so the page's heading depths are kept.
  basicTransformations(parsed, file);

  // blockNestingTransform wraps the content in a bare block; the body's own
  // block replaces it.
  const [only, ...rest] = parsed.children;
  const children =
    only?.type === "block" && rest.length === 0
      ? (only.children ?? [])
      : parsed.children;

  const tree: GenericParent = {
    type: "root",
    children: [{ type: "block", data: { part: "body" }, children }]
  };

  inlineMathSimplificationTransform(tree, { replaceSymbol: false });
  glossaryTransform(tree, file);
  codeTransform(tree, file);
  footnotesTransform(tree, file);

  // mathTransform is left out, as in Raven: the renderer runs KaTeX itself.
  // So is linksTransform, which makes network calls.
  const state = new ReferenceState("site-page", { vfile: file });
  enumerateTargetsTransform(tree, { state });
  resolveLinksAndCitationsTransform(tree, { state });
  resolveReferencesTransform(tree, file, { state });

  return {
    schema: MDAST_SCHEMA_VERSION,
    version: MYST_AST_VERSION,
    tree: finalizeTree(tree),
    citations: { order: [] },
    messages: file.messages.flatMap((message): MdastMessage[] =>
      message.fatal == null
        ? []
        : [
            {
              severity: message.fatal ? "error" : "warning",
              message: message.reason,
              ...(message.line ? { line: message.line } : {})
            }
          ]
    )
  };
}

/**
 * Copies the tree through JSON (separating nodes the resolvers share), drops
 * positions, and keys every node by its depth-first index, as Raven does, so
 * the server and the client render the same keys.
 */
function finalizeTree(tree: GenericParent): MdastNode {
  const copy = JSON.parse(JSON.stringify(tree)) as GenericNode;
  let index = 0;
  const visit = (node: GenericNode) => {
    delete node.position;
    node.key = `k${index++}`;
    node.children?.forEach(visit);
  };
  visit(copy);
  return copy as MdastNode;
}
