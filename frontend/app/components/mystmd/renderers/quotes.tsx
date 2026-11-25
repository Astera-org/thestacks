import { cn } from "@/lib/utils";
import type { GenericNode } from "myst-common";
import { MyST } from "myst-to-react";

/**
 * The classes MyST gives `{epigraph}` and `{pull-quote}`. Other `:class:`
 * values are dropped, so a document cannot apply the site's own utilities.
 */
const QUOTE_CLASSES = new Set(["epigraph", "pull-quote"]);

function quoteClasses(value: unknown): string[] {
  if (typeof value !== "string") return [];
  return value.split(/\s+/).filter((name) => QUOTE_CLASSES.has(name));
}

/**
 * A `{blockquote}`, `{epigraph}` or `{pull-quote}` directive: MyST wraps the
 * quote in a `quote` container and turns a closing "— Author" paragraph into
 * its caption, shown here as the attribution.
 */
export function QuoteContainer({ node }: { node: GenericNode }) {
  const children: GenericNode[] = node.children ?? [];
  const caption = children.find((child) => child.type === "caption");
  const quote = children.filter((child) => child.type !== "caption");
  return (
    <figure
      className={cn("mystmd-quote", ...quoteClasses(node.class))}
      id={node.html_id}
    >
      <MyST ast={quote} />
      {caption && (
        <figcaption className="mystmd-quote-attribution">
          <MyST ast={caption.children} />
        </figcaption>
      )}
    </figure>
  );
}
