import ReferencePopover, {
  linkInfoLabel,
  ReferenceLinkList,
  sortedLinkInfos,
  type ReferenceLinkInfo
} from "@/components/publication/ReferencePopover";
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/stacks-ui/Popover";
import { citeUrl } from "@/lib/mystmd/citations";
import type { GenericNode } from "myst-common";
import { MyST } from "myst-to-react";
import { createContext, useContext } from "react";
import { useMystmdContext } from "../MystmdContext";
import { safeUrl } from "../safeUrl";

/**
 * True inside a footnote's popover. Citations there show their number only;
 * the popover lists the references below the footnote, so no popover opens on
 * top of another.
 */
const InFootnotePopoverContext = createContext(false);

function linkUrl(node: GenericNode): string | undefined {
  return safeUrl(citeUrl(node.label));
}

/**
 * Raven numbers a `cite` (`enumerator`) and labels it with the reference URL,
 * or, for a bibliography entry with no URL, with its citation key and the
 * entry's `citationText`. A URL that is not safe to link to, with no text to
 * show instead, counts as unresolved.
 */
function isResolved(node: GenericNode): boolean {
  if (node.error || !node.enumerator) return false;
  return linkUrl(node) != null || typeof node.citationText === "string";
}

/** One per reference, so citing one twice in a group lists it once. */
function useLinkInfos(cites: GenericNode[]): ReferenceLinkInfo[] {
  const { referenceTextByUrl } = useMystmdContext();
  const byRefNum = new Map<number, ReferenceLinkInfo>();
  for (const cite of cites) {
    const refNum = Number(cite.enumerator);
    if (byRefNum.has(refNum)) continue;
    const url = linkUrl(cite);
    const referenceText = url && referenceTextByUrl.get(url.toLowerCase());
    byRefNum.set(refNum, {
      refNum,
      url,
      text: String(cite.citationText ?? "") || referenceText || ""
    });
  }
  return [...byRefNum.values()];
}

/** A label Raven could not resolve (a bib key, say); it warned on push. */
function UnresolvedCite({ node }: { node: GenericNode }) {
  return (
    <span className="citation-error" title="Citation not found">
      [{String(node.label ?? "?")}]
    </span>
  );
}

/** The citation badge, or, in a footnote's popover, just its number. */
function CiteBadge({ linkInfos }: { linkInfos: ReferenceLinkInfo[] }) {
  if (!useContext(InFootnotePopoverContext)) {
    return <ReferencePopover linkInfos={linkInfos} />;
  }
  return (
    <span className="footnote-popover-cite">{linkInfoLabel(linkInfos)}</span>
  );
}

function Cite({ node }: { node: GenericNode }) {
  const linkInfos = useLinkInfos(isResolved(node) ? [node] : []);
  if (!isResolved(node)) return <UnresolvedCite node={node} />;
  return <CiteBadge linkInfos={linkInfos} />;
}

/** One badge for the group ("4–6"), like adjacent links in Google Docs pubs. */
function CiteGroup({ node }: { node: GenericNode }) {
  const cites = (node.children ?? []).filter(
    (child: GenericNode) => child.type === "cite"
  );
  const resolved = cites.filter(isResolved);
  const linkInfos = useLinkInfos(resolved);
  return (
    <>
      {resolved.length > 0 && <CiteBadge linkInfos={linkInfos} />}
      {cites
        .filter((cite: GenericNode) => !isResolved(cite))
        .map((cite: GenericNode) => (
          <UnresolvedCite key={cite.key} node={cite} />
        ))}
    </>
  );
}

/**
 * "†6": the dagger keeps a footnote apart from a citation, whose marker is a
 * bare number, and the number counts past the few symbols there are. Opens the
 * footnote in a popover; the list in `MystmdFootnotes` links back to `id`.
 */
/** The resolved citations in a footnote, in reading order. */
function resolvedCites(nodes: GenericNode[] = []): GenericNode[] {
  return nodes.flatMap((child) =>
    child.type === "cite"
      ? isResolved(child)
        ? [child]
        : []
      : resolvedCites(child.children)
  );
}

function FootnoteReference({ node }: { node: GenericNode }) {
  const { definitions } = useMystmdContext().footnotes;
  const definition = definitions.find(
    (candidate) => candidate.identifier === node.identifier
  );
  const citedLinkInfos = sortedLinkInfos(
    useLinkInfos(resolvedCites(definition?.children))
  );
  const number = String(node.enumerator ?? node.identifier);
  return (
    <sup className="footnote-ref">
      <Popover>
        <PopoverTrigger asChild>
          <button
            aria-label={`Footnote ${number}`}
            id={`fnref-${String(node.key)}`}
            type="button"
          >
            <span aria-hidden className="footnote-ref-dagger">
              †
            </span>
            {number}
          </button>
        </PopoverTrigger>
        <PopoverContent className="footnote-popover w-100 p-3">
          <div className="flex flex-row gap-2">
            <div className="font-mono">{number}</div>
            <div className="min-w-0">
              <InFootnotePopoverContext value>
                <MyST ast={definition?.children} />
              </InFootnotePopoverContext>
            </div>
          </div>
          {citedLinkInfos.length > 0 && (
            <div className="footnote-popover-references">
              <ReferenceLinkList linkInfos={citedLinkInfos} />
            </div>
          )}
        </PopoverContent>
      </Popover>
    </sup>
  );
}

export const CITATION_RENDERERS = {
  cite: Cite,
  citeGroup: CiteGroup,
  footnoteReference: FootnoteReference,
  // Shown in the reference's popover and listed at the end by MystmdFootnotes.
  footnoteDefinition: () => null
};
