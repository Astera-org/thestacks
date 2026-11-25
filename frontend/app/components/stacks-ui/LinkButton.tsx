import { isHashOnlyTarget } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
// eslint-disable-next-line no-restricted-imports
import { Link as RouterLink } from "react-router";
import { buttonVariants } from "./Button";

type LinkProps = ComponentProps<typeof RouterLink> &
  VariantProps<typeof buttonVariants>;

/**
 * This is an alternative version of a `Link` that is instead formatted
 * like a `stacks-ui/Button`.
 */
export default function LinkButton(props: LinkProps) {
  const {
    to,
    viewTransition,
    prefetch = "intent",
    className,
    size,
    pill,
    intent,
    ...rest
  } = props;

  return (
    <RouterLink
      to={to}
      className={cn(buttonVariants({ size, pill, intent }), className)}
      prefetch={prefetch}
      viewTransition={viewTransition ?? !isHashOnlyTarget(to)}
      {...rest}
    />
  );
}
