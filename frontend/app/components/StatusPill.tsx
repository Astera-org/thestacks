import { cn } from "@/lib/utils";
import { ReactNode } from "react";

export type StatusPillStatus = "pending" | "warning" | "danger" | "success";

export function StatusPill({
  animate,
  className,
  isDark,
  children,
  status,
  transparent
}: {
  animate?: boolean;
  className?: string;
  isDark?: boolean;
  children: ReactNode;
  status: StatusPillStatus;
  transparent?: boolean;
}) {
  return (
    <div
      aria-live="polite"
      className={cn(
        "text-caption-20 inline-flex min-w-0 items-center gap-2 font-mono",
        !transparent && "rounded-full bg-gray-200 px-3 py-1.5",
        isDark ? "text-fg-inverted/70" : "text-fg",
        className
      )}
    >
      <StatusPulse status={status} animate={animate} />
      <span className="min-w-0">{children}</span>
    </div>
  );
}

export function StatusPulse({
  animate,
  status
}: {
  animate?: boolean;
  status: StatusPillStatus;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "size-1.5 shrink-0 rounded-full ring-3",
        status === "pending" && "bg-gray-900 ring-gray-900/25",
        status === "warning" &&
          "bg-butter-yellow-600 ring-butter-yellow-600/25",
        status === "danger" && "bg-error-800 ring-error-800/25",
        status === "success" && "bg-carbon-800 ring-carbon-800/20",
        animate && "animate-pulse motion-reduce:animate-none"
      )}
    />
  );
}

export default StatusPill;
