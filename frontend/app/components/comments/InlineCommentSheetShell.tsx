import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle
} from "@/components/ui/sheet";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { cn } from "@/lib/utils";
import { createPortal } from "react-dom";

interface InlineCommentSheetShellProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  children: React.ReactNode;
}

/**
 * Shared chrome for inline-comment sheets: non-modal side-sheet on desktop
 * (with a portal overlay for visual dimming) and bottom-sheet on mobile.
 */
export default function InlineCommentSheetShell({
  open,
  onOpenChange,
  title,
  description,
  children
}: InlineCommentSheetShellProps) {
  const isMd = useBreakpoint("md");

  return (
    <>
      {open &&
        isMd &&
        createPortal(
          <div
            className="animate-in fade-in-0 bg-overlay/5 fixed inset-0 z-199"
            onClick={() => onOpenChange(false)}
            aria-hidden="true"
          />,
          document.body
        )}

      <Sheet open={open} onOpenChange={onOpenChange} modal={!isMd}>
        <SheetContent
          side={isMd ? "right" : "bottom"}
          className={cn(
            "@container flex flex-col",
            isMd ? "min-w-100 sm:max-w-md" : "max-h-[85svh]"
          )}
          data-testid="inline-comment-sheet"
        >
          <SheetHeader>
            <SheetTitle className="text-[18px]">
              {title}
              <Separator className="mt-4" />
            </SheetTitle>
            <SheetDescription className="sr-only">
              {description}
            </SheetDescription>
          </SheetHeader>

          <div className="scrollbar-hide flex flex-1 flex-col gap-6 overflow-y-auto pt-4 pb-6">
            {children}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
