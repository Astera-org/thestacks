import { ArrowUpIcon } from "@/components/icons";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

interface CollapsibleContainerProps {
  id: string;
  title: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  isOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
}

export default function CollapsibleContainer(props: CollapsibleContainerProps) {
  const { id, title, children, className, isOpen = true, onOpenChange } = props;

  const [internalIsOpen, setInternalIsOpen] = useState(isOpen);

  const [syncedIsOpen, setSyncedIsOpen] = useState(isOpen);
  if (isOpen !== syncedIsOpen) {
    setSyncedIsOpen(isOpen);
    setInternalIsOpen(isOpen);
  }

  useEffect(() => {
    onOpenChange?.(internalIsOpen);
  }, [internalIsOpen, onOpenChange]);

  return (
    <div className={cn("py-8", className)}>
      <button
        id={id}
        type="button"
        onClick={(e) => {
          setInternalIsOpen(!internalIsOpen);
          if (e.detail > 0) e.currentTarget.blur();
        }}
        className="hover:text-fg-muted flex w-full scroll-mt-28 items-center justify-between font-sans text-[24px] font-semibold transition-colors md:scroll-mt-36"
      >
        <div className="font-sans text-[18px] leading-5 md:text-[24px] md:leading-6">
          {title}
        </div>
        <ArrowUpIcon
          className={cn(
            "text-carbon-500 size-5 transition-transform",
            !internalIsOpen && "rotate-180"
          )}
        />
      </button>
      <div
        className={cn(
          "overflow-hidden",
          internalIsOpen ? "opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="mt-6 md:mt-7">{children}</div>
      </div>
    </div>
  );
}
