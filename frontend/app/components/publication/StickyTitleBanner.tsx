import { DoubleArrowUpIcon } from "@/components/icons";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import CommentBubble from "@/components/stacks-ui/CommentBubble";
import IconButton from "@/components/stacks-ui/IconButton";
import useAppNavigate from "@/hooks/useAppNavigate";
import { useHideOnScrollDown } from "@/hooks/useHideOnScrollDown";
import { usePublicationLayout } from "@/hooks/usePublicationLayout";

interface StickyTitleBannerProps {
  title: string;
  numComments: number;
  // Used to expand the comments section before navigating to it, so the page
  // scrolls to the appropriate position.
  setIsCommentsOpen: (isOpen: boolean) => void;
}

export default function StickyTitleBanner(props: StickyTitleBannerProps) {
  const { title, numComments, setIsCommentsOpen } = props;
  const navigate = useAppNavigate();

  const { isHeroInView } = usePublicationLayout();
  const isNavHidden = useHideOnScrollDown();

  // Three positions:
  // - Hero in view: fully hidden above the viewport.
  // - Hero out of view + nav hidden: pinned to the top (covering the nav slot).
  // - Hero out of view + nav visible: slid down below the nav so both show.
  const transform = isHeroInView
    ? "translateY(calc(-100% - var(--spacing-navbar)))"
    : isNavHidden
      ? "translateY(0)"
      : "translateY(var(--spacing-navbar))";

  return (
    <div
      className="bg-pub-header fixed top-0 right-0 left-0 z-50 h-12 transition-transform duration-300 ease-out print:hidden"
      style={{ transform }}
    >
      <div className="max-w-container mx-auto flex h-full w-full items-center justify-between px-4 md:px-8">
        {/* Left side. */}
        <h1 className="mr-4 min-w-0 truncate font-sans font-semibold [&_*]:truncate">
          <MarkdownRenderer markdown={title} />
        </h1>
        {/* Right side. */}
        <div className="text-fg-strong flex shrink-0 items-center gap-4">
          {/* Jump to comments button. */}
          <CommentBubble
            numComments={numComments}
            onClick={() => {
              setIsCommentsOpen(true);
              navigate({ hash: "comments" }, { replace: true });
            }}
            aria-label="Jump to comments"
          />
          {/* Jump to top button. */}
          <IconButton
            intent="ghost"
            size="sm"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            aria-label="Scroll to top"
            icon={<DoubleArrowUpIcon className="h-4 w-3 md:h-4 md:w-4" />}
          />
        </div>
      </div>
    </div>
  );
}
