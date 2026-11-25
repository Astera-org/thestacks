import {
  ChatBubbleOutlineIcon,
  ChatBubbleOutlineWideIcon
} from "@/components/icons";
import { cn } from "@/lib/utils";

interface CommentBubbleProps {
  numComments: number;
  className?: string;
  iconWidth?: number;
  iconHeight?: number;
  textClassName?: string;
  onClick: () => void;
  "aria-label"?: string;
}

export default function CommentBubble(props: CommentBubbleProps) {
  const {
    numComments,
    className,
    iconWidth = 27,
    iconHeight = 25,
    textClassName,
    onClick,
    "aria-label": ariaLabel
  } = props;

  const isWiderIcon = numComments > 99;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative flex items-center justify-center",
        isWiderIcon ? "h-5 w-7 md:h-6 md:w-8" : "h-5 w-6 md:h-6 md:w-7",
        className
      )}
      aria-label={ariaLabel}
    >
      {isWiderIcon ? (
        <ChatBubbleOutlineWideIcon width={iconWidth + 6} height={iconHeight} />
      ) : (
        <ChatBubbleOutlineIcon width={iconWidth} height={iconHeight} />
      )}
      <span
        className={cn(
          "pointer-events-none absolute top-[51%] left-[54%] -translate-x-1/2 -translate-y-1/2 font-mono text-[10px] leading-3 font-semibold md:text-[13px] md:leading-3",
          textClassName
        )}
      >
        {numComments}
      </span>
    </button>
  );
}
