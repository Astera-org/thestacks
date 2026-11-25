import Tooltip from "@/components/stacks-ui/Tooltip";
import { MessageCircle } from "lucide-react";
import { createPortal } from "react-dom";

interface BubbleMenuProps {
  selectionRect: DOMRect;
  disabled: boolean;
  disabledReason: string | null;
  onClick: () => void;
  isMobile: boolean;
}

/**
 * Floating menu that is meant to appear on top of the publication body when
 * the user selects text. On mobile, rendered as a fixed button at the
 * bottom-right of the viewport (above the table-of-contents menu bar) to
 * avoid colliding with the native selection context menu.
 */
export default function BubbleMenu(props: BubbleMenuProps) {
  const { selectionRect, disabled, disabledReason, onClick, isMobile } = props;

  const button = (
    <button
      type="button"
      disabled={disabled}
      onMouseDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!disabled) onClick();
      }}
      className="bg-carbon-700 text-fg-inverted rounded-xl px-2 py-2 text-sm font-medium shadow-lg transition-opacity disabled:cursor-not-allowed disabled:opacity-60 print:hidden"
      data-testid="comment-bubble-menu-button"
    >
      <div className="flex items-center gap-2 rounded-lg px-4 py-1 hover:bg-white/15">
        <MessageCircle
          size={16}
          className="fill-fg-inverted"
          aria-hidden="true"
        />
        Comment
      </div>
    </button>
  );

  if (isMobile) {
    return createPortal(
      <div
        style={{
          position: "fixed",
          bottom: 62,
          right: 16,
          zIndex: 2000
        }}
      >
        {button}
      </div>,
      document.body
    );
  }

  // Desktop: position above the selection, horizontally centered.
  const top = selectionRect.top + window.scrollY - 48;
  const left = selectionRect.left + window.scrollX + selectionRect.width / 2;

  return createPortal(
    <div
      style={{
        position: "absolute",
        top,
        left,
        transform: "translateX(-50%)",
        zIndex: 2000
      }}
    >
      {disabled && disabledReason ? (
        <Tooltip label={disabledReason} side="top">
          {button}
        </Tooltip>
      ) : (
        button
      )}
    </div>,
    document.body
  );
}
