import { cn } from "@/lib/utils";
import * as SheetPrimitive from "@radix-ui/react-dialog";
import { cva, type VariantProps } from "class-variance-authority";
import { ComponentPropsWithRef } from "react";

const Sheet = SheetPrimitive.Root;
const SheetTrigger = SheetPrimitive.Trigger;
const SheetClose = SheetPrimitive.Close;
const SheetPortal = SheetPrimitive.Portal;

/**
 * Dimmed backdrop behind the panel. Clicking it closes the sheet (handled by
 * Radix). Fades in/out and respects reduced-motion.
 */
function SheetOverlay(
  props: ComponentPropsWithRef<typeof SheetPrimitive.Overlay>
) {
  const { className, ...rest } = props;
  return (
    <SheetPrimitive.Overlay
      className={cn(
        "bg-overlay/40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-[200] motion-reduce:animate-none",
        className
      )}
      {...rest}
    />
  );
}

const sheetVariants = cva(
  "fixed z-[200] flex flex-col bg-surface shadow-xl outline-hidden data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:duration-300 data-[state=open]:duration-500 motion-reduce:animate-none motion-reduce:duration-0",
  {
    variants: {
      side: {
        top: "inset-x-0 top-0 border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top",
        bottom:
          "inset-x-0 bottom-0 border-t data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
        left: "inset-y-0 left-0 h-full w-3/4 border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:max-w-sm",
        right:
          "inset-y-0 right-0 h-full w-3/4 border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-sm"
      }
    },
    defaultVariants: {
      side: "bottom"
    }
  }
);

interface SheetContentProps
  extends
    ComponentPropsWithRef<typeof SheetPrimitive.Content>,
    VariantProps<typeof sheetVariants> {}

/**
 * The sliding panel. Built directly on the Radix dialog primitive so it is
 * accessible out of the box: focus is trapped while open and restored to the
 * trigger on close, the background is inert, Escape and outside-clicks dismiss,
 * and the panel slides in from `side` (defaults to "bottom").
 *
 * No close button is baked in — compose {@link SheetClose} where you want one.
 * Always include a {@link SheetTitle} (visually hidden if needed) so assistive
 * tech can name the dialog.
 */
function SheetContent(props: SheetContentProps) {
  const { side = "bottom", className, children, ...rest } = props;
  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Content
        className={cn(sheetVariants({ side }), className)}
        {...rest}
      >
        {children}
      </SheetPrimitive.Content>
    </SheetPortal>
  );
}

/** Accessible name for the sheet. Wrap with `sr-only` when not shown visually. */
function SheetTitle(props: ComponentPropsWithRef<typeof SheetPrimitive.Title>) {
  const { className, ...rest } = props;
  return (
    <SheetPrimitive.Title
      className={cn("text-fg font-sans text-lg font-semibold", className)}
      {...rest}
    />
  );
}

/** Optional supporting description, linked via `aria-describedby`. */
function SheetDescription(
  props: ComponentPropsWithRef<typeof SheetPrimitive.Description>
) {
  const { className, ...rest } = props;
  return (
    <SheetPrimitive.Description
      className={cn("text-fg-muted text-sm", className)}
      {...rest}
    />
  );
}

export {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetOverlay,
  SheetPortal,
  SheetTitle,
  SheetTrigger
};
