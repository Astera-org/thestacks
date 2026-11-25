import { cn } from "@/lib/utils";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

export const buttonVariants = cva(
  "inline-flex w-fit items-center justify-center border text-center font-mono transition-colors disabled:pointer-events-none",
  {
    variants: {
      size: {
        sm: "min-h-8 text-caption-30 px-4 py-1",
        md: "min-h-7 md:min-h-9 text-caption-40 px-5 py-1",
        lg: "min-h-12 text-caption-50 px-6 py-1.5"
      },
      pill: {
        true: "rounded-full",
        false: "rounded-lg"
      },
      intent: {
        primary:
          "bg-primary border-primary text-fg-inverted hover:bg-primary-hover active:bg-primary-hover disabled:opacity-80",
        secondary:
          "border-primary border text-fg-strong disabled:opacity-50 hover:bg-primary-hover hover:text-fg-inverted",
        destructive:
          "bg-destructive border-destructive text-fg-inverted hover:bg-destructive-hover active:bg-destructive-hover disabled:opacity-80",
        // Quiet hairline pill for secondary actions inside cards.
        outline:
          "bg-surface border-border-strong text-fg-strong hover:border-primary disabled:opacity-50",
        outlineInverted:
          "border-fg-inverted text-fg-inverted bg-transparent hover:bg-fg-inverted hover:text-fg-strong disabled:opacity-50"
      }
    },
    defaultVariants: {
      size: "md",
      pill: true,
      intent: "primary"
    }
  }
);

interface ButtonProps
  extends
    Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "size">,
    VariantProps<typeof buttonVariants> {
  children: React.ReactNode;
  asChild?: boolean;
}

export default function Button(props: ButtonProps) {
  const { children, className, size, pill, intent, asChild, ...rest } = props;
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      type={asChild ? undefined : "button"}
      className={cn(buttonVariants({ size, pill, intent }), className)}
      {...rest}
    >
      {children}
    </Comp>
  );
}
