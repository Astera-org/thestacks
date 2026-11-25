import { Skeleton } from "@/components/Skeleton";
import Button from "@/components/stacks-ui/Button";
import CollapsibleRegion from "@/components/stacks-ui/CollapsibleRegion";
import { EditPublicationStatus } from "@/hooks/use-edit-publication/types";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import { ReactNode, useId } from "react";
import { PublicationStatusPill } from "./PublicationStatusPill";

export default function Section({
  banner,
  children,
  collapsed: collapsedControl,
  collapseExternally: collapsesExternally,
  collapsible = true,
  id,
  kicker,
  note,
  onToggleCollapse,
  right,
  status,
  statusPill,
  title,
}: {
  /** Full-width notice under the title row, shown even when collapsed. */
  banner?: ReactNode;
  children: ReactNode;
  collapsed: boolean;
  /**
   * If `collapseExternally` is `true` then the button will still show the
   * appropriate label, but the `CollapsibleRegion` section will not be
   * triggerd and the content will stay visible.
   */
  collapseExternally?: boolean;
  /** Hides the collapse button, e.g. when there's nothing to collapse. */
  collapsible?: boolean;
  id?: string;
  kicker?: ReactNode;
  note?: ReactNode;
  onToggleCollapse: () => void;
  right?: ReactNode;
  status: EditPublicationStatus;
  /** Replaces the default autosave pill. */
  statusPill?: ReactNode;
  title: string;
}) {
  const regionId = useId();
  const collapsed = collapsedControl && !collapsesExternally;

  return (
    <section
      aria-label={title}
      className="border-border bg-surface scroll-mt-28 rounded-2xl border px-5 py-7 md:scroll-mt-36 md:px-9 md:py-9"
      id={id}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between md:gap-8">
        <div className="min-w-0">
          {kicker && (
            <span className="text-caption-30 text-gray-blue-400 font-mono">
              {kicker}
            </span>
          )}
          <h2 className="text-headline-30 text-fg-strong mt-2 font-serif">
            {title}
          </h2>
        </div>
        {right && (
          <div className="flex flex-wrap items-center gap-2 md:justify-end">
            {right}
          </div>
        )}
      </div>

      {banner && <div className="mt-5">{banner}</div>}

      {note && (
        <div className="text-body-30 text-fg mt-3 max-w-4xl">
          {status.status === "init" ? (
            <Skeleton className="w-3/5 rounded-full" />
          ) : (
            note
          )}
        </div>
      )}

      <div className="mt-4 flex items-center justify-between gap-4">
        {statusPill ?? (
          <PublicationStatusPill
            savedMessage={({ timeAgo }) =>
              `${title} edits autosaved · ${timeAgo}`
            }
            status={status}
          />
        )}
        {collapsible && (
          <Button
            aria-controls={regionId}
            aria-expanded={!collapsedControl}
            className="shrink-0 gap-1.5"
            intent="outline"
            size="sm"
            onClick={onToggleCollapse}
          >
            <ChevronDown
              className={cn(
                "size-3.5 transition-transform motion-reduce:transition-none",
                collapsedControl && "-rotate-90"
              )}
            />
            {collapsedControl ? "Expand" : "Collapse"}
          </Button>
        )}
      </div>

      <CollapsibleRegion id={regionId} isOpen={!collapsed}>
        <div className="border-border mt-7 border-t pt-7">{children}</div>
      </CollapsibleRegion>
    </section>
  );
}
