import { cn } from "@/lib/utils";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

const chipVariants = cva(
  "text-caption-40 inline-flex w-fit items-center truncate gap-2 rounded-full font-mono text-fg-strong transition-colors",
  {
    variants: {
      size: {
        xs: "h-6 px-2 text-caption-20",
        sm: "h-7 px-3",
        md: "h-8 px-4",
        lg: "h-9 px-5"
      },
      intent: {
        primary: "bg-sky-blue-400",
        secondary: "border border-gray-blue-900",
        muted: "bg-gray-200 text-fg-muted"
      }
    },
    defaultVariants: {
      size: "md",
      intent: "primary"
    }
  }
);

interface ChipProps
  extends
    Omit<React.HTMLAttributes<HTMLSpanElement>, "size">,
    VariantProps<typeof chipVariants> {
  children: React.ReactNode;
  asChild?: boolean;
}

export default function Chip(props: ChipProps) {
  const { children, className, size, intent, asChild, ...rest } = props;
  const Comp = asChild ? Slot : "span";

  return (
    <Comp className={cn(chipVariants({ size, intent }), className)} {...rest}>
      {children}
    </Comp>
  );
}
