import type { PublicationMdast } from "@/apiv1/mdast";
import Link from "@/components/Link";
import { MystProvider } from "@/components/myst/MystContext";
import { useFigureActions } from "@/components/myst/useFigureActions";
import { collectFootnotes } from "@/lib/mystmd/footnotes";
import { partChildren, purposeHeadingId } from "@/lib/mystmd/headings";
import type { Publication } from "@/types";
import {
  ArticleProvider,
  type Link as MystLink,
  Theme,
  ThemeProvider
} from "@myst-theme/providers";
import type { GenericNode, GenericParent } from "myst-common";
import { MyST } from "myst-to-react";
import { type ReactNode, useMemo } from "react";
import { type MystmdContextValue, MystmdProvider } from "./MystmdContext";
import MystmdFootnotes from "./MystmdFootnotes";
import { STACKS_RENDERERS } from "./renderers/stacksRenderers";

/** myst-to-react's internal links go through the app's own `Link`. */
const RouterLink: MystLink = ({ to, prefetch, children, ...rest }) => (
  <Link prefetch={prefetch === "none" ? "none" : "intent"} to={to} {...rest}>
    {children}
  </Link>
);

const ARTICLE_KIND = "Article" as Parameters<typeof ArticleProvider>[0]["kind"];

function noop() {}

interface MystmdRendererProps {
  mdast: PublicationMdast;
  /** Absent on site pages (such as About), which are not publications. */
  publication?: Publication;
  isDraft?: boolean;
}

/**
 * Renders a MyST publication from Raven's MyST AST with myst-to-react and
 * Stacks-branded renderers (see the `initial-myst-support` skill). Only MyST
 * publications and site pages written in MyST (whose AST
 * `buildSitePageMdast` builds) use it; it is loaded lazily, so other pages do
 * not download myst-to-react.
 */
export default function MystmdRenderer({
  mdast,
  publication,
  isDraft = false
}: MystmdRendererProps) {
  const tree = mdast.tree as GenericParent;
  const { mystContextValue, lightbox } = useFigureActions(publication?.slug);

  const math = mdast.frontmatter?.math;
  const mediaAssets = publication?.mediaAssets;
  const publicationReferences = publication?.references;
  const mystmdContextValue = useMemo(
    (): MystmdContextValue => ({
      footnotes: collectFootnotes(tree),
      isDraft,
      mathMacros: Object.fromEntries(
        Object.entries(math ?? {}).map(([name, { macro }]) => [name, macro])
      ),
      mediaAssetByUrl: new Map(
        (mediaAssets ?? []).map((asset) => [asset.publicUrl, asset])
      ),
      referenceTextByUrl: new Map(
        (publicationReferences ?? []).map((ref) => [
          ref.url.toLowerCase(),
          ref.text
        ])
      )
    }),
    [isDraft, math, mediaAssets, publicationReferences, tree]
  );

  const references = useMemo(() => ({ article: tree }), [tree]);

  // Memoised like MystRenderer's output, so text selections and comment
  // highlights survive re-renders caused by unrelated state.
  const article: ReactNode = useMemo(() => {
    const abstract = partChildren(tree, "abstract") as GenericNode[];
    return (
      <>
        {abstract.length > 0 && (
          // TODO: Make the heading above the abstract an org-level setting.
          <>
            <h1 id={purposeHeadingId(tree)}>Purpose</h1>
            <MyST ast={abstract} />
          </>
        )}
        <MyST ast={partChildren(tree, "body") as GenericNode[]} />
        <MystmdFootnotes />
      </>
    );
  }, [tree]);

  return (
    <ThemeProvider
      Link={RouterLink}
      renderers={STACKS_RENDERERS}
      setTheme={noop}
      theme={Theme.light}
    >
      <ArticleProvider kind={ARTICLE_KIND} references={references}>
        <MystmdProvider value={mystmdContextValue}>
          <MystProvider value={mystContextValue}>{article}</MystProvider>
        </MystmdProvider>
      </ArticleProvider>
      {lightbox}
    </ThemeProvider>
  );
}
