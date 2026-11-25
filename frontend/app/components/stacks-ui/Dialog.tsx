import { CloseIcon } from "@/components/icons";
import { cn } from "@/lib/utils";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cva } from "class-variance-authority";
import * as React from "react";

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: React.ReactNode;
  /** Screen-reader-only context for what the dialog does. */
  description?: React.ReactNode;
  children: React.ReactNode;
  /** Overrides for the card, e.g. `max-w-2xl`. */
  className?: string;
  /**
   * Small label above the title. Setting it switches to the framed layout:
   * a header bar, a padded body, and a footer bar.
   */
  kicker?: string;
  /** Framed layout: the footer's left side, e.g. Cancel or a caption. */
  footerStart?: React.ReactNode;
  /**
   * Framed layout: the footer's right side, e.g. the main action. Wrap
   * several actions in your own flex container.
   */
  footerEnd?: React.ReactNode;
}

const dialogContentVariants = cva(
  "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 border-border-strong bg-surface relative my-8 w-full max-w-lg rounded-2xl border p-6 shadow-lg ease-out data-[state=closed]:duration-200 data-[state=open]:duration-300 motion-reduce:animate-none md:p-10",
  {
    variants: {
      // The framed layout pads its own header, body, and footer bars.
      framed: { true: "overflow-hidden p-0 md:p-0", false: "" }
    },
    defaultVariants: { framed: false }
  }
);

export function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <DialogPrimitive.Overlay className="data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 bg-overlay/80 fixed inset-0 z-[250] grid place-items-center overflow-y-auto p-4 ease-out data-[state=closed]:duration-200 data-[state=open]:duration-500 motion-reduce:animate-none">
      {children}
    </DialogPrimitive.Overlay>
  );
}

export default function Dialog(props: DialogProps) {
  const {
    open,
    onOpenChange,
    title,
    description,
    children,
    className,
    kicker,
    footerStart,
    footerEnd
  } = props;
  const framed = kicker !== undefined;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        {/* The overlay is the scroll container so the whole card scrolls when
            it is taller than the viewport (Radix "scrollable overlay" pattern). */}
        <Overlay>
          <DialogPrimitive.Content
            // Radix warns when a dialog has no description; opt out explicitly.
            {...(description ? {} : { "aria-describedby": undefined })}
            className={cn(dialogContentVariants({ framed }), className)}
          >
            {framed ? (
              <div className="border-border flex items-start justify-between border-b p-6 pb-4">
                <div>
                  <span className="text-caption-20 text-fg-muted font-mono uppercase">
                    {kicker}
                  </span>
                  <DialogPrimitive.Title asChild>
                    <h3 className="text-headline-10 text-fg-strong mt-1.5 font-serif">
                      {title}
                    </h3>
                  </DialogPrimitive.Title>
                </div>
              </div>
            ) : (
              title && (
                <DialogPrimitive.Title
                  asChild={typeof title !== "string"}
                  className={cn(
                    "text-body-40 text-fg-strong font-medium",
                    typeof title === "string" ? "pr-8" : null
                  )}
                >
                  {title}
                </DialogPrimitive.Title>
              )
            )}
            {description && (
              <DialogPrimitive.Description className="sr-only">
                {description}
              </DialogPrimitive.Description>
            )}

            {framed ? (
              <>
                <div className="flex flex-col gap-5 px-6 py-5">{children}</div>
                {(footerStart || footerEnd) && (
                  <div className="border-border bg-surface-sunken flex flex-wrap items-center justify-between gap-3 border-t px-6 py-4">
                    {footerStart}
                    {footerEnd}
                  </div>
                )}
              </>
            ) : (
              <div className={typeof title === "string" ? "mt-6" : undefined}>
                {children}
              </div>
            )}

            <DialogPrimitive.Close
              aria-label="Close"
              className="text-fg-muted hover:text-fg absolute top-5 right-5 transition-colors"
            >
              <CloseIcon className="size-5" />
            </DialogPrimitive.Close>
          </DialogPrimitive.Content>
        </Overlay>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
