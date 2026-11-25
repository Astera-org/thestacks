import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-warm-sand-100 text-info-900 hover:bg-warm-sand-100/80",
        secondary:
          "border-transparent bg-aqua-blue-600 text-carbon-700 hover:bg-aqua-blue-600/80",
        destructive:
          "border-transparent bg-error-800 text-warm-sand-100 hover:bg-error-800/80",
        outline: "text-carbon-400 border-carbon-400"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
);

export interface BadgeProps
  extends
    React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
