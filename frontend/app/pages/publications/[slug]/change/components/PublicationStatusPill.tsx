import { StatusPill, StatusPillStatus } from "@/components/StatusPill";
import { EditPublicationStatus } from "@/hooks/use-edit-publication/types";
import { useTimeFromNow } from "@/hooks/useTimeFromNow";
import { ReactNode } from "react";

export function PublicationStatusPill({
  className,
  isDark,
  savedMessage,
  status: statusObj,
  transparent,
}: {
  className?: string;
  isDark?: boolean;
  /**
   * The function form guarantees `lastUpdated` is non-null for the caller,
   * instead of making the prop assume it.
   */
  savedMessage?:
    | ReactNode
    | ((options: { lastUpdated: Date; timeAgo: string | null }) => ReactNode);
  status: EditPublicationStatus;
  transparent?: boolean;
}) {
  const { lastUpdated, status } = statusObj;
  const timeAgo = useTimeFromNow(lastUpdated, { textCase: "lower" });

  const genericStatus: StatusPillStatus =
    status === "error" || status === "offline" || status === "conflict"
      ? "danger"
      : status === "init"
        ? "pending"
        : status === "saving"
          ? "warning"
          : "success";

  return (
    <StatusPill
      animate={genericStatus === "warning"}
      className={className}
      isDark={isDark}
      status={genericStatus}
      transparent={transparent}
    >
      {
        // prettier-ignore
        status === "init"
          ? "Loading…"
        : status === "saving"
          ? "Saving…"
        : status === "error"
          ? "Error saving"
        : status === "offline"
          ? "Offline"
        : status === "conflict"
          ? "Edited elsewhere"
        : lastUpdated === null
          ? "Up to date"
        : typeof savedMessage === "function"
          ? savedMessage({ lastUpdated, timeAgo })
        : (savedMessage ?? `Auto-saved ${timeAgo}`)
      }
    </StatusPill>
  );
}
