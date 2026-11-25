import { cn } from "@/lib/utils";
import type { ComponentType, ReactNode, SVGProps } from "react";

interface NoResultsProps {
  /** Short, primary line (e.g. "You're all caught up"). */
  title: string;
  /** Optional supporting sentence explaining the empty state. */
  description?: ReactNode;
  /** Icon component, rendered in a bordered circle above the title. */
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
  /** Optional call to action, e.g. a <Button>. */
  action?: ReactNode;
  className?: string;
}

export default function NoResults(props: NoResultsProps) {
  const { title, description, icon: Icon, action, className } = props;

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-4 py-16 text-center",
        className
      )}
    >
      {Icon && (
        <span className="border-gray-blue-900 text-fg-strong flex size-7 shrink-0 items-center justify-center rounded-full border md:size-9">
          <Icon className="size-5" />
        </span>
      )}

      <div className="flex flex-col gap-2">
        <p className="text-headline-20 text-fg-strong font-serif">{title}</p>
        {description && (
          <p className="text-body-40 text-fg-muted max-w-sm">{description}</p>
        )}
      </div>

      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
