import { cn } from "@/lib/utils";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { ReactNode } from "react";

interface TooltipProps {
  /**
   * Text shown inside the tooltip. The tooltip's appearance is fixed by design
   * and intentionally cannot be overridden from the outside.
   */
  label: ReactNode;
  /** The trigger element the tooltip describes. */
  children: ReactNode;
  /** Which side of the trigger the tooltip appears on. Defaults to "top". */
  side?: "top" | "bottom" | "left" | "right";
  /**
   * Color treatment. "dark" (default) is the solid dark bubble; "light" is a
   * white, outlined bubble that reads clearly when shown over a dark surface
   * (e.g. inside a dark popover panel).
   */
  variant?: "dark" | "light";
}

/**
 * Tooltip with two locked styles (dark and light). It is built on the Radix
 * primitive so it renders in a portal (never clipped by an ancestor's
 * `overflow`) and is accessible out of the box: the trigger is linked via
 * `aria-describedby`, it reveals on hover and keyboard focus, and dismisses on
 * Escape.
 */
export default function Tooltip(props: TooltipProps) {
  const { label, children, side = "top", variant = "dark" } = props;
  const isLight = variant === "light";

  return (
    <TooltipPrimitive.Provider delayDuration={100}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            side={side}
            sideOffset={8}
            className={cn(
              "text-caption-40 animate-in fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 z-[310] flex min-h-9 max-w-xs items-center rounded-xl px-3 py-1.5 font-mono text-balance select-none",
              isLight
                ? "border-gray-blue-200 text-fg-strong bg-surface border shadow-md"
                : "bg-gray-blue-900 text-fg-inverted"
            )}
          >
            {label}
            {isLight ? (
              // A rotated square straddles the panel edge so only its two outer
              // (bordered) sides show as the caret; the inner unbordered corner
              // is hidden behind the bubble. Radix's arrow wrapper re-orients it
              // per side, so this single "down-pointing" config works for all.
              <TooltipPrimitive.Arrow asChild>
                <span className="border-gray-blue-200 bg-surface block size-2.5 -translate-y-1/2 rotate-45 border-r border-b" />
              </TooltipPrimitive.Arrow>
            ) : (
              <TooltipPrimitive.Arrow
                className="fill-gray-blue-900"
                width={16}
                height={8}
              />
            )}
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}
