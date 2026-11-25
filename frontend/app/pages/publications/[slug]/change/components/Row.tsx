import Chip from "@/components/stacks-ui/Chip";
import { cn } from "@/lib/utils";
import { Lock } from "lucide-react";
import { ReactNode } from "react";

export function LockedBadge({ className }: { className?: string }) {
  return (
    <Chip
      className={cn("gap-1.5 rounded-md", className)}
      intent="muted"
      size="xs"
    >
      Locked
      <Lock aria-hidden className="size-3" />
    </Chip>
  );
}

export default function Row({
  id,
  label,
  required,
  optional,
  locked,
  hint,
  children,
}: {
  id?: string;
  label: string;
  required?: boolean;
  optional?: boolean;
  /** Shows the "Locked" badge; the field itself renders its own read-only state. */
  locked?: boolean;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div
      className="border-border grid gap-4 border-t py-8 first:border-t-0 first:pt-0 last:pb-0 md:grid-cols-[minmax(0,17rem)_minmax(0,1fr)] md:gap-10"
      id={id}
    >
      <div>
        <div className="text-body-30 text-fg-strong flex flex-wrap items-center gap-2 font-medium">
          <span>
            {label}
            {required && (
              <span aria-hidden className="text-periwinkle-500 ml-0.5">
                *
              </span>
            )}
            {required && <span className="sr-only"> (required)</span>}
          </span>
          {locked && <LockedBadge />}
          {optional && !locked && (
            <Chip className="rounded-md" intent="muted" size="xs">
              Optional
            </Chip>
          )}
        </div>
        {hint && (
          <div className="text-caption-20 text-fg-muted mt-2 max-w-64">
            {hint}
          </div>
        )}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
