import type { PublicationMdast } from "@/apiv1/mdast";
import MystRenderer from "@/components/MystRenderer";
import MystmdRenderer, {
  isMystmdRendererLoaded
} from "@/components/mystmd/LazyMystmdRenderer";
import BodyPlaceholder from "@/components/publication/BodyPlaceholder";
import HashTarget from "@/components/publication/HashTarget";
import { isMystPublication } from "@/lib/mystmd";
import { cn } from "@/lib/utils";
import type { Publication } from "@/types";
import { memo, Suspense, useEffect, useMemo, useState } from "react";

export interface PublicationViewProps {
  publication: Publication;
  className?: string;
  onRefUrlToNum?: (map: Map<string, number>) => void;
  /** A MyST publication's AST; without it, the existing renderer is used. */
  mdast?: PublicationMdast | null;
  /** A MyST draft's AST is still loading. */
  isMdastLoading?: boolean;
  isDraft?: boolean;
}

export default memo(function PublicationView(props: PublicationViewProps) {
  const {
    publication,
    className,
    onRefUrlToNum,
    mdast,
    isMdastLoading = false,
    isDraft = false
  } = props;
  const isMyst = isMystPublication(publication);
  // The MyST renderer is loaded on the server and before hydration, so only a
  // client-side navigation needs a Suspense boundary. Without one there, React
  // would stream the body after the rest of the page, and ScrollRestoration
  // would restore the reader's position on a page that ends too soon. Decided
  // once, since changing the wrapper would remount the body.
  const [suspends] = useState(() => !isMystmdRendererLoaded());

  useEffect(() => {
    if (isMyst && !mdast && !isMdastLoading) {
      console.warn(
        "Rendering a MyST publication with the older renderer: its AST is unavailable."
      );
    }
  }, [isMyst, mdast, isMdastLoading]);

  // Combine abstract and body so reference numbering is continuous.
  const abstractAndBodyMyst = useMemo(() => {
    return publication.abstract
      ? // TODO: Make the heading above the abstract an org-level setting.
        `# Purpose\n\n${publication.abstract}\n\n${publication.body}`
      : publication.body;
  }, [publication.abstract, publication.body]);

  const olderRenderer = (
    <MystRenderer
      publication={publication}
      myst={abstractAndBodyMyst}
      onRefUrlToNum={onRefUrlToNum}
    />
  );

  let body;
  if (isMdastLoading) {
    body = <BodyPlaceholder />;
  } else if (mdast) {
    // The older renderer stands in if the MyST renderer fails to download.
    const renderer = (
      <>
        <MystmdRenderer
          fallback={olderRenderer}
          isDraft={isDraft}
          mdast={mdast}
          publication={publication}
        />
        <HashTarget />
      </>
    );
    body = suspends ? (
      <Suspense fallback={<BodyPlaceholder />}>{renderer}</Suspense>
    ) : (
      renderer
    );
  } else {
    body = (
      <>
        {olderRenderer}
        <HashTarget />
      </>
    );
  }

  return (
    <article
      id="publication-body"
      className={cn("prose", mdast && "mystmd", className)}
    >
      {body}
    </article>
  );
});
