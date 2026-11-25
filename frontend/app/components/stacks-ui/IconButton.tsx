import { cn } from "@/lib/utils";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

const iconButtonVariants = cva(
  "inline-flex items-center shrink-0 justify-center border font-mono transition-colors disabled:pointer-events-none",
  {
    variants: {
      size: {
        xs: "size-7",
        sm: "size-8",
        md: "size-7 md:size-9",
        lg: "size-11"
      },
      pill: {
        true: "rounded-full",
        false: "rounded-lg"
      },
      intent: {
        primary:
          "bg-primary border-primary text-fg-inverted hover:bg-primary-hover active:bg-primary-hover disabled:opacity-80",
        secondary:
          "border-primary text-fg-strong bg-surface hover:bg-primary-hover hover:text-fg-inverted disabled:opacity-50",
        // Transparent, role-colored outline; the glyph shades on hover.
        outline:
          "bg-transparent border-fg-strong text-fg-strong hover-shade disabled:opacity-50",
        outlineInverted:
          "bg-transparent border-fg-inverted text-fg-inverted hover-shade hover-shade-invert disabled:opacity-50",
        // Chrome-less: no border or fill; the glyph inherits color and shades on hover.
        ghost:
          "bg-transparent border-transparent hover-shade disabled:opacity-50"
      }
    },
    defaultVariants: {
      size: "md",
      pill: false,
      intent: "primary"
    }
  }
);

interface IconButtonProps
  extends
    Omit<React.ComponentProps<"button">, "size">,
    VariantProps<typeof iconButtonVariants> {
  icon: React.ReactNode;
  asChild?: boolean;
}

export default function IconButton(props: IconButtonProps) {
  const { icon, className, size, pill, intent, asChild, ...rest } = props;
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      type={asChild ? undefined : "button"}
      className={cn(iconButtonVariants({ size, pill, intent }), className)}
      {...rest}
    >
      <span className="inline-flex size-5 items-center justify-center">
        {icon}
      </span>
    </Comp>
  );
}
