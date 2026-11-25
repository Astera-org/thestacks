import { CLASSES } from "@thestacks/myst-renderer";
import {
  type ComponentPropsWithoutRef,
  useEffect,
  useRef,
  useState
} from "react";

import { cn } from "@/lib/utils";

import { useMystContext } from "./MystContext";

interface MystFigureProps extends ComponentPropsWithoutRef<"figure"> {
  node?: any;
}

// Keep a figure floated only while it leaves a readable text column beside it,
// measured against the real column so the same figure floats in a wide column
// and centers in a narrow one.
const MIN_TEXT_COLUMN = 250; // px
const FLOAT_GUTTER = 40; // px, the margin beside a float

/**
 * Custom <figure> component for react-markdown.
 * Handles clicks on action buttons (Expand/Download) via event delegation.
 */
export default function MystFigure({
  node: _node,
  className,
  children,
  ...props
}: MystFigureProps) {
  const ref = useRef<HTMLElement>(null);
  const ctx = useMystContext();
  const [floatSuppressed, setFloatSuppressed] = useState(false);

  useEffect(() => {
    const figure = ref.current;
    if (!figure) return;

    const isFloated =
      figure.classList.contains("float-left") ||
      figure.classList.contains("float-right");
    if (!isFloated) return;

    const media = figure.querySelector("img, video, iframe");
    const column = figure.parentElement;
    if (!media || !column) return;

    const update = () => {
      const style = getComputedStyle(column);
      const columnWidth =
        column.clientWidth -
        parseFloat(style.paddingLeft) -
        parseFloat(style.paddingRight);
      const mediaWidth = media.getBoundingClientRect().width;
      if (columnWidth <= 0 || mediaWidth <= 0) return;
      setFloatSuppressed(
        columnWidth - mediaWidth - FLOAT_GUTTER < MIN_TEXT_COLUMN
      );
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(column);
    return () => observer.disconnect();
  }, []);

  const handleClick = async (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const button = target.closest(
      `.${CLASSES.FIGURE_ACTION_BUTTON}`
    ) as HTMLElement | null;
    if (!button || !ref.current) return;

    const ariaLabel = button.getAttribute("aria-label");
    if (ariaLabel === "Expand" && ctx?.onExpandFigure) {
      await ctx.onExpandFigure(ref.current);
    } else if (ariaLabel === "Download" && ctx?.onDownloadMedia) {
      e.preventDefault();
      // The buttons now live in the caption, so reach for the figure's single
      // media target rather than an ancestor of the button.
      const actionTarget = ref.current.querySelector(
        `.${CLASSES.FIGURE_ACTION_TARGET}`
      ) as HTMLElement | null;
      if (actionTarget) {
        await ctx.onDownloadMedia(actionTarget);
      }
    }
  };

  return (
    <figure
      ref={ref}
      onClick={handleClick}
      className={cn(className, floatSuppressed && "float-suppressed")}
      {...props}
    >
      {children}
    </figure>
  );
}
