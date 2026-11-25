import { ArrowUpIcon } from "@/components/icons";
import CollapsibleRegion from "@/components/stacks-ui/CollapsibleRegion";
import IconButton from "@/components/stacks-ui/IconButton";
import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

const boxVariants = cva("rounded-xl p-4 md:p-6", {
  variants: {
    variant: {
      primary: "bg-surface-sunken",
      secondary: "bg-gray-blue-700 text-fg-inverted"
    }
  },
  defaultVariants: {
    variant: "primary"
  }
});

const triggerVariants = cva(
  "group text-body-70 flex w-full scroll-mt-28 items-center justify-between md:scroll-mt-36",
  {
    variants: {
      variant: {
        primary: "text-fg-strong",
        secondary: "text-fg-inverted"
      }
    },
    defaultVariants: {
      variant: "primary"
    }
  }
);

// Overrides layered on top of IconButton's `secondary` intent so the arrow
// affordance stays visible against each box background. The whole header row
// is the trigger, so hover is driven by `group-hover` and the arrow keeps no
// direct hover of its own (`pointer-events-none`).
const arrowVariants = cva("pointer-events-none print:hidden", {
  variants: {
    variant: {
      primary: "group-hover:bg-gray-blue-800 group-hover:text-fg-inverted",
      secondary:
        "border-white bg-transparent text-fg-inverted group-hover:bg-white group-hover:text-gray-blue-700"
    }
  },
  defaultVariants: {
    variant: "primary"
  }
});

interface BoxedCollapsibleProps extends VariantProps<typeof boxVariants> {
  /** Anchor id, also the deep-link target for hash navigation. */
  id: string;
  title: React.ReactNode;
  /** Lowercase noun for the trigger aria-label, e.g. "references". */
  label: string;
  /** Controlled open state of the section. */
  isOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
  children: React.ReactNode;
  className?: string;
}

/**
 * Boxed section with a full-width collapsible header and an arrow IconButton
 * affordance. `primary` is the white box (references); `secondary` is the dark
 * gray-blue box with white text.
 */
export default function BoxedCollapsible({
  id,
  title,
  label,
  isOpen = false,
  onOpenChange,
  variant,
  children,
  className
}: BoxedCollapsibleProps) {
  return (
    <div className={cn(boxVariants({ variant }), className)}>
      {/* The whole header row is the trigger; IconButton renders asChild (a
          span) so it's not a nested button. */}
      <button
        type="button"
        id={id}
        aria-expanded={isOpen}
        aria-controls={`${id}-content`}
        aria-label={isOpen ? `Collapse ${label}` : `Expand ${label}`}
        onClick={() => onOpenChange?.(!isOpen)}
        className={triggerVariants({ variant })}
      >
        <span>{title}</span>
        <IconButton
          asChild
          size="sm"
          intent="secondary"
          className={arrowVariants({ variant })}
          icon={
            <ArrowUpIcon
              className={cn(
                "size-5 transition-transform duration-200 ease-out",
                !isOpen && "rotate-180"
              )}
            />
          }
        />
      </button>

      <CollapsibleRegion
        id={`${id}-content`}
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        className="mt-6 md:mt-7"
      >
        {children}
      </CollapsibleRegion>
    </div>
  );
}
