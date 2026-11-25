import { headingId } from "@/lib/mystmd/headings";
import { hasClass } from "@/lib/mystmd/nodes";
import { cn } from "@/lib/utils";
import type { GenericNode } from "myst-common";
import { MyST } from "myst-to-react";
import type { ReactNode } from "react";

/** The Stacks `details` structure that prose.css animates. */
function StacksDetails({
  id,
  className,
  open,
  summary,
  children
}: {
  id?: string;
  className?: string;
  open?: boolean;
  summary: ReactNode;
  children: ReactNode;
}) {
  return (
    <details className={className} id={id} open={open}>
      <summary>{summary}</summary>
      <div className="details-content-border">
        <div className="details-content-wrapper">{children}</div>
      </div>
    </details>
  );
}

/** `{note}`, `{tip}`, …: an info box, or a dropdown with `:class: dropdown`. */
function Admonition({ node }: { node: GenericNode }) {
  const children: GenericNode[] = node.children ?? [];
  const title = children.find((child) => child.type === "admonitionTitle");
  const body = children.filter((child) => child !== title);
  const kindClass = `admonition-${String(node.kind ?? "note")}`;

  if (hasClass(node, "dropdown")) {
    return (
      <StacksDetails
        className={cn("mystmd-admonition", kindClass)}
        id={headingId(node)}
        open={node.open === true}
        summary={<MyST ast={title?.children} />}
      >
        <MyST ast={body} />
      </StacksDetails>
    );
  }

  return (
    <aside
      className={cn("info-box mystmd-admonition", kindClass)}
      id={headingId(node)}
    >
      {title && (
        <p className="admonition-title">
          <MyST ast={title.children} />
        </p>
      )}
      <MyST ast={body} />
    </aside>
  );
}

/** `{dropdown}`: a `details` node whose first child is its `summary`. */
function Details({ node }: { node: GenericNode }) {
  const children: GenericNode[] = node.children ?? [];
  const summary = children.find((child) => child.type === "summary");
  return (
    <StacksDetails
      id={headingId(node)}
      open={Boolean(node.open)}
      summary={<MyST ast={summary?.children} />}
    >
      <MyST ast={children.filter((child) => child !== summary)} />
    </StacksDetails>
  );
}

export const ADMONITION_RENDERERS = {
  admonition: Admonition,
  details: Details
};
