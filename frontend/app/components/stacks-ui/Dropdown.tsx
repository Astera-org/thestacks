import { cn } from "@/lib/utils";
import * as DropdownPrimitive from "@radix-ui/react-dropdown-menu";
import { ComponentPropsWithRef } from "react";

const Dropdown = DropdownPrimitive.Root;
const DropdownTrigger = DropdownPrimitive.Trigger;

/**
 * Dark, on-brand dropdown panel built directly on the Radix primitive (it does
 * not go through components/ui). Always portals so it is never clipped by an
 * ancestor's `overflow`. The dark panel is the default style; pass `className`
 * to extend it (e.g. to pin the width to the trigger). Compose rows with
 * {@link DropdownItem}.
 */
function DropdownContent(
  props: ComponentPropsWithRef<typeof DropdownPrimitive.Content>
) {
  const { className, align = "start", sideOffset = 8, ...rest } = props;

  return (
    <DropdownPrimitive.Portal>
      <DropdownPrimitive.Content
        align={align}
        sideOffset={sideOffset}
        className={cn(
          "bg-menu border-gray-blue-700 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 text-fg-inverted z-[300] min-w-44 rounded-xl border p-2 font-sans shadow-xl outline-hidden",
          className
        )}
        {...rest}
      />
    </DropdownPrimitive.Portal>
  );
}

/** A single selectable row inside a {@link DropdownContent} menu. */
function DropdownItem(
  props: ComponentPropsWithRef<typeof DropdownPrimitive.Item>
) {
  const { className, ...rest } = props;

  return (
    <DropdownPrimitive.Item
      className={cn(
        "text-caption-40 hover:bg-menu-hover focus:bg-menu-hover text-fg-inverted focus:text-fg-inverted flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-1.5 text-left outline-hidden select-none",
        className
      )}
      {...rest}
    />
  );
}

export { Dropdown, DropdownContent, DropdownItem, DropdownTrigger };
