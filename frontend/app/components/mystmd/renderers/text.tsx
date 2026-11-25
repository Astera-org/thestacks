import Link from "@/components/Link";
import { headingId } from "@/lib/mystmd/headings";
import type { GenericNode } from "myst-common";
import { MyST } from "myst-to-react";
import { useMystmdContext } from "../MystmdContext";
import { safeUrl } from "../safeUrl";

const HEADING_TAGS = ["h1", "h2", "h3", "h4", "h5", "h6"] as const;

/**
 * MyST keeps `#` for the page title, so a page's sections start at `##`.
 * They render one level up, as `<h1>` beside Purpose, the way the table of
 * contents lists them (`headingsFromMdast`); a `#` in the body joins them.
 *
 * Raven numbers a heading (`enumerator`) only when the document's `numbering`
 * frontmatter turns numbering on for its level, so the number shows only then.
 */
function Heading({ node }: { node: GenericNode }) {
  const depth = Math.min(Math.max((Number(node.depth) || 2) - 1, 1), 6);
  const Tag = HEADING_TAGS[depth - 1]!;
  return (
    <Tag id={headingId(node)}>
      {node.enumerator && (
        <span className="mystmd-heading-number">{String(node.enumerator)}</span>
      )}
      <MyST ast={node.children} />
    </Tag>
  );
}

/** Site links navigate in-app; everything else opens in a new tab. */
function LinkRenderer({ node }: { node: GenericNode }) {
  const url = safeUrl(node.url);
  const children = node.children?.length ? <MyST ast={node.children} /> : url;
  if (!url) return <>{children}</>;
  if (url.startsWith("#")) return <a href={url}>{children}</a>;
  if (/^\/(?!\/)/.test(url)) return <Link to={url}>{children}</Link>;
  return (
    <a href={url} rel="noopener noreferrer" target="_blank">
      {children}
    </a>
  );
}

function CrossReference({ node }: { node: GenericNode }) {
  const id = headingId(node);
  if (!node.resolved || !id) {
    return (
      <span className="text-carbon-400">
        <MyST ast={node.children} />
      </span>
    );
  }
  return (
    <a className="cross-reference" href={`#${id}`}>
      <MyST ast={node.children} />
    </a>
  );
}

/**
 * Directives and roles the parser did not know: render what they contain,
 * and on drafts say what was not understood. Raven warns about them on push.
 */
function UnknownDirective({ node }: { node: GenericNode }) {
  const { isDraft } = useMystmdContext();
  if (node.children?.length) return <MyST ast={node.children} />;
  if (!isDraft) return null;
  return (
    <p className="mystmd-unknown text-carbon-400 text-caption-40 font-mono">
      Unknown directive <code>{`{${String(node.name)}}`}</code>; it is not shown
      to readers.
    </p>
  );
}

function UnknownRole({ node }: { node: GenericNode }) {
  if (node.children?.length) return <MyST ast={node.children} />;
  return <>{typeof node.value === "string" ? node.value : null}</>;
}

export const TEXT_RENDERERS = {
  heading: Heading,
  link: LinkRenderer,
  crossReference: CrossReference,
  mystDirective: UnknownDirective,
  mystRole: UnknownRole,
  // Raw HTML is not rendered yet; without this, its markup would show as text.
  // Raven warns about it on push (see the initial-myst-support skill).
  html: () => null
};
