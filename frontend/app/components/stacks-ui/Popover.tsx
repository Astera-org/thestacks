import { cn } from "@/lib/utils";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { Slot } from "@radix-ui/react-slot";
import { ComponentPropsWithRef } from "react";

const Popover = PopoverPrimitive.Root;
const PopoverTrigger = PopoverPrimitive.Trigger;
const PopoverAnchor = PopoverPrimitive.Anchor;

interface PopoverContentProps extends ComponentPropsWithRef<
  typeof PopoverPrimitive.Content
> {
  /**
   * Render the content inline instead of portaling to document.body. Use this
   * when the popover lives inside a high-z-index layer (e.g. a Sheet) so it
   * inherits the parent's stacking context and focus trap.
   */
  disablePortal?: boolean;
  /** `light` is the white panel used for in-form pickers. */
  variant?: "dark" | "light";
}

/**
 * On-brand popover panel built directly on the Radix primitive (it does
 * not go through components/ui). Portals by default so it is never clipped by an
 * ancestor's `overflow`. Dark by default; pass `variant="light"` for in-form
 * pickers and `className` to extend it. Compose rows with {@link PopoverItem}.
 */
function PopoverContent(props: PopoverContentProps) {
  const {
    className,
    align = "start",
    sideOffset = 8,
    disablePortal,
    variant = "dark",
    ...rest
  } = props;

  const content = (
    <PopoverPrimitive.Content
      align={align}
      sideOffset={sideOffset}
      className={cn(
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 z-[300] w-auto min-w-44 rounded-xl border p-2 font-sans shadow-xl outline-hidden motion-reduce:animate-none",
        variant === "dark"
          ? "bg-menu border-gray-blue-700 text-fg-inverted"
          : "bg-surface border-border text-fg",
        className
      )}
      {...rest}
    />
  );

  if (disablePortal) return content;
  return <PopoverPrimitive.Portal>{content}</PopoverPrimitive.Portal>;
}

interface PopoverItemProps extends ComponentPropsWithRef<"button"> {
  /** Render as the child element (e.g. an `<a>`) instead of a `<button>`. */
  asChild?: boolean;
}

/** A single selectable row inside a {@link PopoverContent} menu. */
function PopoverItem(props: PopoverItemProps) {
  const { className, asChild, ...rest } = props;
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      type={asChild ? undefined : "button"}
      className={cn(
        "text-caption-40 hover:bg-menu-hover text-fg-inverted flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left transition-colors",
        className
      )}
      {...rest}
    />
  );
}

export { Popover, PopoverAnchor, PopoverContent, PopoverItem, PopoverTrigger };
