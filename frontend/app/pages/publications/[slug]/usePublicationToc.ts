import type { PublicationMdast } from "@/apiv1/mdast";
import { useActiveHeading } from "@/hooks/useActiveHeading";
import { extractHeadings } from "@/lib/markdown";
import { headingsFromMdast } from "@/lib/mystmd/headings";
import { useMemo } from "react";

/** A MyST publication's headings come from its AST, the others from the body. */
export function usePublicationToc(
  body: string | undefined,
  mdast?: PublicationMdast | null
) {
  const headings = useMemo(
    () =>
      mdast
        ? headingsFromMdast(mdast.tree)
        : [
            // TODO: Make the heading above the abstract an org-level setting.
            {
              id: "purpose",
              text: "Purpose",
              depth: 1,
              hasChildren: false
            },
            ...extractHeadings(body || "")
          ],
    [body, mdast]
  );

  const activeHeadingId = useActiveHeading(headings);

  return { headings, activeHeadingId };
}
