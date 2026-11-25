import { ArrowUpIcon, ChatBubbleIcon } from "@/components/icons";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import CiteButton from "@/components/publication/CiteButton";
import DownloadPDFButton from "@/components/publication/DownloadPDFButton";
import ExportToMdButton from "@/components/publication/ExportToMdButton";
import ShareButton from "@/components/publication/ShareButton";
import { Sheet, SheetContent, SheetTitle } from "@/components/stacks-ui/Sheet";
import Tooltip from "@/components/stacks-ui/Tooltip";
import useAppNavigate from "@/hooks/useAppNavigate";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { useHideOnScrollDown } from "@/hooks/useHideOnScrollDown";
import { publicationUrls } from "@/lib/publications";
import { cn } from "@/lib/utils";
import type { Heading, Publication } from "@/types";
import { useCallback, useEffect, useMemo, useState } from "react";

// Ordered to match the sections as they appear under the article body.
const quickLinks = [
  "Feedback form",
  "Contributors",
  "References",
  "Comments",
  "Social"
];

// Soft upward shadow that lifts the mobile bottom bar / sheet off the page.
// There is no theme token for an upward shadow, so this stays a custom value
// but lives in one place since the bar and the sheet share it.
const bottomSheetShadowClassName =
  "shadow-[0_-4px_24px_-8px] shadow-gray-blue-900/20";

/**
 * The `headings` parameter is an ordered list of headings, where each heading
 * has a `depth` property and `hasChildren` flag. This function builds a tree of
 * heading nodes from the given headings, where each node has a heading and an
 * array of child headings.
 */
function buildHeadingTree(headings: Heading[]): HeadingNode[] {
  const nodes: HeadingNode[] = [];
  let i = 0;

  while (i < headings.length) {
    const heading = headings[i];
    const children: HeadingNode[] = [];

    if (heading.hasChildren) {
      let j = i + 1;
      const childHeadings: Heading[] = [];
      while (j < headings.length && headings[j].depth > heading.depth) {
        childHeadings.push(headings[j]);
        j++;
      }
      // Recursively build tree for children.
      if (childHeadings.length > 0) {
        children.push(...buildHeadingTree(childHeadings));
      }
      i = j;
    } else {
      i++;
    }

    nodes.push({ heading, children });
  }

  return nodes;
}

interface HeadingNode {
  heading: Heading;
  children: HeadingNode[];
}

interface HeadingNodeProps {
  node: HeadingNode;
  isExpanded: boolean;
  onToggle: (id: string) => void;
  activeHeadingId?: string | null;
  onHeadingClick?: (headingId: string) => void;
}

function HeadingNode(props: HeadingNodeProps) {
  const { node, isExpanded, onToggle, activeHeadingId, onHeadingClick } = props;

  const { heading, children } = node;
  const isActive = heading.id === activeHeadingId;
  const hasChildren = heading.hasChildren && children.length > 0;

  const linkClassName = cn(
    "group text-caption-40 md:text-fg-strong ps-3 font-normal text-fg-inverted transition-colors hover:underline [&_b]:font-normal [&_strong]:font-normal [&>div]:min-w-0 [&>div]:flex-1 [&_p]:truncate",
    isActive && "underline"
  );

  // Leaf heading: just a link, no toggle.
  if (!hasChildren) {
    return (
      <li className="relative">
        <a
          href={`#${heading.id}`}
          aria-current={isActive ? "location" : undefined}
          className={cn(linkClassName, "block max-w-sm overflow-hidden")}
          onClick={(e) => {
            e.preventDefault();
            onHeadingClick?.(heading.id);
          }}
        >
          <MarkdownRenderer markdown={heading.text} isAnchorChild />
        </a>
      </li>
    );
  }

  // Section heading: link plus an expand/collapse toggle for its children.
  const childListId = `toc-section-${heading.id}`;

  return (
    <li className="relative">
      <div className="flex items-center">
        <a
          href={`#${heading.id}`}
          aria-current={isActive ? "location" : undefined}
          className={cn(linkClassName, "flex min-w-0 flex-1 items-center")}
          onClick={(e) => {
            e.preventDefault();
            onHeadingClick?.(heading.id);
          }}
        >
          <MarkdownRenderer markdown={heading.text} isAnchorChild />
        </a>
        <button
          type="button"
          className="ps-1"
          onClick={(e) => {
            e.preventDefault();
            onToggle(heading.id);
          }}
          aria-expanded={isExpanded}
          aria-controls={childListId}
          aria-label={isExpanded ? "Collapse section" : "Expand section"}
        >
          <ArrowUpIcon
            aria-hidden
            className={cn(
              "md:text-fg-strong text-fg-inverted size-5 transition-transform",
              !isExpanded && "rotate-180"
            )}
          />
        </button>
      </div>
      {isExpanded && (
        <ul id={childListId} className="ps-5">
          {children.map((childNode) => (
            <HeadingNode
              key={childNode.heading.id}
              node={childNode}
              isExpanded={isExpanded}
              onToggle={onToggle}
              activeHeadingId={activeHeadingId}
              onHeadingClick={onHeadingClick}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

interface MobileMenuBarProps {
  publication: Publication;
  publicationUrl: string;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  className?: string;
  showExport: boolean;
}

function MobileMenuBar(props: MobileMenuBarProps) {
  const {
    publication,
    publicationUrl,
    isOpen,
    setIsOpen,
    className,
    showExport
  } = props;
  return (
    <div
      className={cn(
        "bg-pub-toc flex h-16 w-full shrink-0 items-center justify-between",
        className
      )}
    >
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="text-fg-inverted flex grow items-center gap-2 font-mono text-[14px] uppercase"
      >
        <ArrowUpIcon
          aria-hidden
          className={cn(
            "text-fg-inverted size-5 transition-transform",
            !isOpen && "rotate-180"
          )}
        />
        Table of Contents{" "}
      </button>
      <div className="flex items-center gap-2">
        <ShareButton
          publicationTitle={publication.title}
          publicationUrl={publicationUrl}
          intent="outlineInverted"
          size="sm"
        />

        {publication.pdf_url && (
          <DownloadPDFButton
            pdfUrl={publication.pdf_url}
            intent="outlineInverted"
            size="sm"
          />
        )}

        <CiteButton
          publication={publication}
          intent="outlineInverted"
          size="sm"
        />

        {showExport && (
          <ExportToMdButton
            publication={publication}
            intent="outlineInverted"
            size="sm"
          />
        )}
      </div>
    </div>
  );
}

interface TocListsProps {
  tree: HeadingNode[];
  expandedIds: Set<string>;
  toggleExpanded: (id: string) => void;
  activeHeadingId?: string | null;
  numComments: number;
  hasContributors: boolean;
  hasReferences: boolean;
  hasFeedbackForm: boolean;
  hasSocial: boolean;
  onHeadingClick: (headingId: string) => void;
  setIsReferencesOpen: (isOpen: boolean) => void;
  setIsCommentsOpen: (isOpen: boolean) => void;
  setIsFeedbackFormOpen: (isOpen: boolean) => void;
  setIsSocialOpen: (isOpen: boolean) => void;
}

/**
 * The heading tree and quick links shared by the desktop sidebar and the mobile
 * bottom sheet. The markup is identical between the two layouts (colors switch
 * via `md:` variants), so it lives here to keep the two in sync.
 */
function TocLists(props: TocListsProps) {
  const {
    tree,
    expandedIds,
    toggleExpanded,
    activeHeadingId,
    numComments,
    hasContributors,
    hasReferences,
    hasFeedbackForm,
    hasSocial,
    onHeadingClick,
    setIsReferencesOpen,
    setIsCommentsOpen,
    setIsFeedbackFormOpen,
    setIsSocialOpen
  } = props;

  // Drop the links whose sections aren't rendered, so the quick links never
  // point at a section that isn't on the page.
  const visibleQuickLinks = quickLinks.filter((quickLink) => {
    if (quickLink === "Contributors") return hasContributors;
    if (quickLink === "References") return hasReferences;
    if (quickLink === "Feedback form") return hasFeedbackForm;
    if (quickLink === "Social") return hasSocial;
    return true;
  });

  return (
    <>
      {/* Heading tree. */}
      <ul className="md:border-pub-toc border-l border-white p-0 font-mono">
        {tree.map((node) => (
          <HeadingNode
            key={node.heading.id}
            node={node}
            isExpanded={expandedIds.has(node.heading.id)}
            onToggle={toggleExpanded}
            activeHeadingId={activeHeadingId}
            onHeadingClick={onHeadingClick}
          />
        ))}
      </ul>

      {/* Quick links. */}
      <ul className="md:border-pub-toc mt-7 flex flex-col border-l border-white font-mono">
        {visibleQuickLinks.map((quickLink) => {
          const linkId = quickLink.toLowerCase().replace(/ /g, "-");
          return (
            <li key={quickLink}>
              <a
                href={`#${linkId}`}
                className="group md:text-fg-strong text-caption-40 text-fg-inverted flex min-w-0 items-center gap-2 ps-3 font-normal hover:underline"
                onClick={(e) => {
                  if (quickLink === "References") {
                    setIsReferencesOpen(true);
                  } else if (quickLink === "Comments") {
                    setIsCommentsOpen(true);
                  } else if (quickLink === "Feedback form") {
                    setIsFeedbackFormOpen(true);
                  } else if (quickLink === "Social") {
                    setIsSocialOpen(true);
                  }
                  e.preventDefault();
                  onHeadingClick(linkId);
                }}
              >
                <span className="truncate">{quickLink}</span>
                {/* Show the number of comments if the quick link is "Comments". */}
                {quickLink === "Comments" && (
                  <span className="flex shrink-0 items-center gap-1">
                    <ChatBubbleIcon
                      aria-hidden
                      className="md:text-fg-strong text-fg-inverted h-3 w-4"
                    />
                    {numComments}
                  </span>
                )}
              </a>
            </li>
          );
        })}
      </ul>
    </>
  );
}

interface TableOfContentsProps {
  publication: Publication;
  headings: Heading[];
  activeHeadingId?: string | null;
  numComments: number;
  hasContributors: boolean;
  hasReferences: boolean;
  hasFeedbackForm: boolean;
  hasSocial: boolean;
  // This is used to expand sections before navigating to them,
  // so that the page scrolls to the appropriate position.
  setIsReferencesOpen: (isOpen: boolean) => void;
  setIsCommentsOpen: (isOpen: boolean) => void;
  setIsFeedbackFormOpen: (isOpen: boolean) => void;
  setIsSocialOpen: (isOpen: boolean) => void;
  showExport: boolean;
}

export function TableOfContents(props: TableOfContentsProps) {
  const {
    publication,
    headings,
    activeHeadingId,
    numComments,
    hasContributors,
    hasReferences,
    hasFeedbackForm,
    hasSocial,
    setIsReferencesOpen,
    setIsCommentsOpen,
    setIsFeedbackFormOpen,
    setIsSocialOpen,
    showExport
  } = props;

  const navigate = useAppNavigate();

  // We use this to conditionally render the mobile or desktop layout.
  const isMd = useBreakpoint("md");
  // Slide the mobile bottom bar out of view on scroll down, reveal on scroll
  // up — the same signal the header uses so both move in sync.
  const isHidden = useHideOnScrollDown();
  const [prevIsMd, setPrevIsMd] = useState(isMd);
  const [isOpen, setIsOpen] = useState(isMd);

  if (isMd !== prevIsMd) {
    setIsOpen(isMd);
    setPrevIsMd(isMd);
  }

  const handleHeadingClick = useCallback(
    (headingId: string) => {
      // Close mobile menu if on mobile.
      if (!isMd) {
        setIsOpen(false);
      }
      // Update URL hash and scroll to heading.
      navigate({ hash: headingId }, { replace: true });
    },
    [isMd, setIsOpen, navigate]
  );

  // Track which headings are expanded. All are initially collapsed.
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Toggle the expansion of a heading.
  const toggleExpanded = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // Auto-expand H1 headings when they become active.
  useEffect(() => {
    if (!activeHeadingId) return;

    const activeHeading = headings.findIndex((h) => h.id === activeHeadingId);
    if (activeHeading === -1) return;

    // Start from the active heading and find its H1.
    let headingSectionId = headings[activeHeading].id;

    for (let i = activeHeading; i >= 0; i--) {
      if (headings[i].depth === 1) {
        headingSectionId = headings[i].id;
        break;
      }
    }

    // Only keep this H1 expanded; everything else closes automatically.
    const newExpandedIds = new Set([headingSectionId]);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setExpandedIds(newExpandedIds);
  }, [activeHeadingId, headings]);

  // Build the heading tree.
  const tree = buildHeadingTree(headings);

  // Get the publication URL.
  const publicationUrl = useMemo(() => {
    const { basePublicationUrl, versionedPublicationUrl } = publicationUrls(
      publication,
      publication.version_number
    );
    return publication.version_number !== publication.versions?.length
      ? versionedPublicationUrl
      : basePublicationUrl;
  }, [publication]);

  // No headings — there's nothing to navigate, so don't render the TOC.
  if (headings.length === 0) {
    return null;
  }

  const tocLists = (
    <TocLists
      tree={tree}
      expandedIds={expandedIds}
      toggleExpanded={toggleExpanded}
      activeHeadingId={activeHeadingId}
      numComments={numComments}
      hasContributors={hasContributors}
      hasReferences={hasReferences}
      hasFeedbackForm={hasFeedbackForm}
      hasSocial={hasSocial}
      onHeadingClick={handleHeadingClick}
      setIsReferencesOpen={setIsReferencesOpen}
      setIsCommentsOpen={setIsCommentsOpen}
      setIsFeedbackFormOpen={setIsFeedbackFormOpen}
      setIsSocialOpen={setIsSocialOpen}
    />
  );

  // On mobile, a persistent bar sits at the bottom of the screen and opens an
  // accessible bottom sheet (Radix dialog): it traps focus while open, restores
  // focus to the bar on close, closes on Escape or an outside click, and slides
  // up from the bottom. The bar stays mounted as the trigger; the sheet reuses
  // the same menu bar as its header so the collapse affordance is unchanged.
  //
  // The slide is offset by the header height (`h-16` = 4rem) so the sheet stops
  // with its header exactly over the persistent bar instead of sliding fully
  // off-screen — the menu bar appears to stay put while the body slides in/out.
  if (!isMd) {
    return (
      <>
        <MobileMenuBar
          publication={publication}
          publicationUrl={publicationUrl}
          isOpen={isOpen}
          setIsOpen={setIsOpen}
          className={cn(
            "fixed inset-x-0 bottom-0 z-200 rounded-t-2xl px-4 transition-transform duration-300 ease-out",
            // Keep the bar in place while the sheet is open (it's the trigger);
            // otherwise slide it down out of view on downward scroll.
            isHidden && !isOpen && "translate-y-full",
            bottomSheetShadowClassName
          )}
          showExport={showExport}
        />
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetContent
            side="bottom"
            // The menu bar is our collapse control, so no separate description.
            aria-describedby={undefined}
            // Offset the slide by the header height (`h-16` = 4rem) so the sheet
            // stops with its menu bar exactly over the persistent bar rather than
            // sliding fully off-screen. These vars drive tw-animate-css's
            // enter/exit keyframes; setting them inline beats the variant's
            // default 100% without an `!important` arbitrary class.
            style={
              {
                "--tw-enter-translate-y": "calc(100% - 4rem)",
                "--tw-exit-translate-y": "calc(100% - 4rem)"
              } as React.CSSProperties
            }
            className={cn(
              "bg-pub-toc text-fg-inverted max-h-[85dvh] overflow-y-auto rounded-t-2xl border-t-0 px-4 pb-6",
              bottomSheetShadowClassName
            )}
          >
            <SheetTitle className="sr-only">Table of contents</SheetTitle>
            <MobileMenuBar
              publication={publication}
              publicationUrl={publicationUrl}
              isOpen={isOpen}
              setIsOpen={setIsOpen}
              showExport={showExport}
            />
            {tocLists}
          </SheetContent>
        </Sheet>
      </>
    );
  }

  // On desktop, this is a hamburger menu button to the right of the publication
  // body that expands the sticky sidebar.
  if (!isOpen) {
    return (
      <nav className="sticky top-36 mb-6 bg-transparent!">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="border-pub-toc flex min-h-16 flex-col justify-center gap-2 border-l p-2 ps-5"
          aria-label="Open table of contents"
        >
          <div className="bg-pub-toc h-1 w-4" />
          <div className="bg-pub-toc h-1 w-4" />
          <div className="bg-pub-toc h-1 w-4" />
        </button>
      </nav>
    );
  }

  // Desktop sidebar: a sticky, always-on panel (not a modal).
  return (
    <nav
      aria-label="Table of contents"
      className="bg-surface-sunken sticky top-36 flex max-w-full min-w-full flex-col overflow-hidden rounded-[20px] border p-8"
    >
      {tocLists}

      {/* Share, Download, Cite buttons. */}
      <div className="mt-6 hidden flex-wrap items-center gap-2 md:flex">
        <Tooltip label="Share" side="bottom">
          <ShareButton
            publicationTitle={publication.title}
            publicationUrl={publicationUrl}
          />
        </Tooltip>

        {publication.pdf_url && (
          <Tooltip label="View / Download" side="bottom">
            <DownloadPDFButton pdfUrl={publication.pdf_url} />
          </Tooltip>
        )}

        <Tooltip label="Cite" side="bottom">
          <CiteButton publication={publication} />
        </Tooltip>

        {showExport ? (
          <Tooltip label="Export to Markdown" side="bottom">
            <ExportToMdButton publication={publication} />
          </Tooltip>
        ) : null}
      </div>
    </nav>
  );
}
