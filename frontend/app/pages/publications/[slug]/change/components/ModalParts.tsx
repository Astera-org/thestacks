import Button, { buttonVariants } from "@/components/stacks-ui/Button";
import { cn } from "@/lib/utils";
import { type VariantProps } from "class-variance-authority";
import { Info, Loader2 } from "lucide-react";
import { type ReactNode } from "react";

/** An info callout in a framed dialog's body. */
export function ModalNote({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "text-body-20 text-fg bg-surface-sunken flex items-start gap-2.5 rounded-lg px-4 py-3",
        className
      )}
    >
      <Info aria-hidden className="text-fg-muted mt-0.5 size-4 shrink-0" />
      <span>{children}</span>
    </p>
  );
}

/** A footer action that shows a spinner and a busy label while it runs. */
export function ModalBusyButton({
  busy,
  busyLabel,
  children,
  disabled,
  intent,
  onClick,
}: {
  busy: boolean;
  busyLabel: string;
  children: ReactNode;
  disabled?: boolean;
  intent?: VariantProps<typeof buttonVariants>["intent"];
  onClick: () => void;
}) {
  return (
    <Button
      aria-busy={busy}
      className="gap-2"
      disabled={disabled}
      intent={intent}
      size="sm"
      onClick={onClick}
    >
      {busy && <Loader2 aria-hidden className="size-3.5 animate-spin" />}
      {busy ? busyLabel : children}
    </Button>
  );
}
