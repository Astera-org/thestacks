import { isHashOnlyTarget } from "@/lib/navigation";
import type { ComponentProps } from "react";
import { Link as RouterLink } from "react-router";

type LinkProps = ComponentProps<typeof RouterLink>;

/**
 * The app's only link. Opts navigation into the View Transition that drives the
 * page fade, and prefetches on intent. Unstyled: it is plumbing, not UI, which is
 * why it lives outside `stacks-ui`. Pass `viewTransition={false}` to opt out.
 */
export default function Link(props: LinkProps) {
  const { to, viewTransition, prefetch = "intent", ...rest } = props;

  return (
    <RouterLink
      to={to}
      prefetch={prefetch}
      viewTransition={viewTransition ?? !isHashOnlyTarget(to)}
      {...rest}
    />
  );
}
