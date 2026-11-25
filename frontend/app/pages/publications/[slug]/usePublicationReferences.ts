import type { PublicationMdast } from "@/apiv1/mdast";
import type { ListedReference } from "@/components/publication/ReferencesSection";
import { citationTextByIdentifier, citeUrl } from "@/lib/mystmd/citations";
import type { Publication, Reference } from "@/types";
import { useCallback, useMemo, useState } from "react";

interface OrderedReferences {
  sortedReferences: ListedReference[];
  referenceNumbers: number[];
}

/**
 * Sorts references to match the [1], [2], … numbering rendered inline. The
 * rehype reference-link plugin reports a URL → number mapping via
 * `onRefUrlToNum` during render; a MyST publication's numbering comes from
 * its AST's citation order instead, so it is right on the first SSR render.
 */
export function usePublicationReferences(
  publication: Publication | null | undefined,
  mdast?: PublicationMdast | null
) {
  // Populated by the rehype reference-link plugin during markdown rendering.
  const [renderedRefUrlToNum, setRefUrlToNum] = useState<Map<string, number>>(
    new Map()
  );
  const handleRefUrlToNum = useCallback(
    (map: Map<string, number>) => setRefUrlToNum(map),
    []
  );

  const { sortedReferences, referenceNumbers } = useMemo(() => {
    if (!publication) return { sortedReferences: [], referenceNumbers: [] };
    if (mdast) return mdastOrderedReferences(publication.references, mdast);
    return renderedOrderedReferences(
      publication.references,
      renderedRefUrlToNum
    );
  }, [publication, mdast, renderedRefUrlToNum]);

  return {
    handleRefUrlToNum,
    sortedReferences,
    referenceNumbers
  };
}

/**
 * One reference per entry of `citations.order`, numbered by its position,
 * then the publication's references the body does not cite. A cited
 * bibliography entry takes its text from the AST: Raven never writes it to
 * `references`, whose row for the entry's URL, if any, may have no text.
 */
function mdastOrderedReferences(
  references: Reference[],
  mdast: PublicationMdast
): OrderedReferences {
  const referenceByUrl = new Map(
    references.map((ref) => [ref.url.toLowerCase(), ref])
  );
  const citationTexts = citationTextByIdentifier(mdast.tree);

  const cited: ListedReference[] = mdast.citations.order.map((identifier) => {
    const reference = referenceByUrl.get(identifier.toLowerCase());
    return {
      text: citationTexts.get(identifier) || reference?.text || "",
      url: reference?.url ?? citeUrl(identifier)
    };
  });
  const citedUrls = new Set(
    mdast.citations.order.map((identifier) => identifier.toLowerCase())
  );
  const uncited = references.filter(
    (ref) => !citedUrls.has(ref.url.toLowerCase())
  );

  const sorted = [...cited, ...uncited];
  return {
    sortedReferences: sorted,
    referenceNumbers: sorted.map((_, i) => i + 1)
  };
}

function renderedOrderedReferences(
  references: Reference[],
  refUrlToNum: Map<string, number>
): OrderedReferences {
  const sorted = [...references].sort((a, b) => {
    const aNum = refUrlToNum.get(a.url.toLowerCase());
    const bNum = refUrlToNum.get(b.url.toLowerCase());
    if (aNum == null && bNum == null) return 0;
    if (aNum == null) return 1;
    if (bNum == null) return -1;
    return aNum - bNum;
  });

  // Fall back to 1-based index for references not found in the body text.
  const numbers = sorted.map((ref, i) => {
    const num = refUrlToNum.get(ref.url.toLowerCase());
    return num ?? i + 1;
  });
  return { sortedReferences: sorted, referenceNumbers: numbers };
}
