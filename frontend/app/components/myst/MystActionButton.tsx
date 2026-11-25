import IconButton from "@/components/stacks-ui/IconButton";
import { CLASSES } from "@thestacks/myst-renderer";
import type { ComponentPropsWithoutRef } from "react";

interface MystActionButtonProps extends ComponentPropsWithoutRef<"button"> {
  node?: unknown;
}

/** True for the figure Download / Expand buttons injected by the renderer. */
export function isFigureActionButton(className?: string): boolean {
  return (className ?? "").split(/\s+/).includes(CLASSES.FIGURE_ACTION_BUTTON);
}

// react-markdown routes every <button> in the article through here. Figure
// action buttons (Download / Expand, injected by the renderer) render as real
// IconButtons; the `figure-action-btn` class is kept so click delegation and
// the loading toggle still work. Any other button passes through unchanged.
export default function MystActionButton({
  node: _node,
  className,
  children,
  ...props
}: MystActionButtonProps) {
  if (!isFigureActionButton(className)) {
    return (
      <button className={className} {...props}>
        {children}
      </button>
    );
  }

  return (
    <IconButton
      intent="primary"
      size="xs"
      pill
      className={className}
      icon={children}
      {...props}
    />
  );
}
