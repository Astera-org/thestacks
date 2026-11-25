import { CaretDownIcon, ChatBubbleOutlineIcon } from "@/components/icons";
import Button from "@/components/stacks-ui/Button";
import CollapsibleRegion from "@/components/stacks-ui/CollapsibleRegion";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface FeedbackFormSectionProps {
  /** Embed URL for the feedback form iframe. Section is hidden when absent. */
  embedSrc?: string | null;
  /** Controlled open state of the whole feedback section. */
  isOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
  className?: string;
}

export default function FeedbackFormSection({
  embedSrc,
  isOpen = false,
  onOpenChange,
  className
}: FeedbackFormSectionProps) {
  // Defers the embed until the section is first opened (when it starts
  // collapsed), and keeps it mounted afterwards so collapsing and reopening
  // doesn't reload the form.
  const [hasBeenOpened, setHasBeenOpened] = useState(isOpen);
  if (isOpen && !hasBeenOpened) {
    setHasBeenOpened(true);
  }

  if (!embedSrc) {
    return null;
  }

  return (
    <section
      id="feedback-form"
      aria-labelledby="feedback-form-title"
      className={cn(
        "bg-sky-blue-200 scroll-mt-28 rounded-xl p-4 md:scroll-mt-36 md:p-6",
        className
      )}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-5">
        <div className="flex flex-1 items-center gap-4">
          <div className="bg-surface text-fg-strong flex size-12 shrink-0 items-center justify-center rounded-xl">
            <ChatBubbleOutlineIcon width={24} height={22} />
          </div>
          <div className="min-w-0">
            <div
              id="feedback-form-title"
              className="text-body-70 text-fg-strong"
            >
              Share your feedback on this pub
            </div>
          </div>
        </div>

        <Button
          size="md"
          aria-expanded={isOpen}
          aria-controls="feedback-form-content"
          onClick={() => onOpenChange?.(!isOpen)}
          className="w-full gap-2 md:w-fit"
        >
          {isOpen ? "Hide form" : "Open form"}
          <CaretDownIcon
            aria-hidden
            className={cn(
              "size-5 transition-transform duration-200 ease-out motion-reduce:transition-none",
              isOpen && "rotate-180"
            )}
          />
        </Button>
      </div>

      <CollapsibleRegion
        id="feedback-form-content"
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        className="border-gray-blue-900/15 text-body-30 text-fg-strong mt-6 flex flex-col gap-6 border-t pt-6"
      >
        <div className="space-y-4">
          <p>This form is quick and anonymous.</p>
          <p>
            If you have more substantive feedback, please leave a public comment
            so other readers can benefit from the discussion.
          </p>
        </div>
        {hasBeenOpened && (
          <iframe
            src={embedSrc}
            title="Feedback form"
            loading="lazy"
            className="h-100 w-full border-0"
          />
        )}
      </CollapsibleRegion>
    </section>
  );
}
