import { cn } from "@/lib/utils";
import { ReactNode } from "react";

export default function VisCard({
  active,
  disabled,
  icon,
  onClick,
  sub,
  title,
}: {
  active: boolean;
  disabled?: boolean;
  icon: ReactNode;
  onClick: () => void;
  sub: ReactNode;
  title: string;
}) {
  return (
    <button
      className={cn(
        "border-gray-blue-900/10 relative flex items-start gap-3.5 rounded-xl border bg-white p-4.5 text-left font-sans transition-colors",
        active && "border-carbon-800 ring-carbon-600/6 ring-3"
      )}
      disabled={disabled}
      onClick={onClick}
    >
      <div
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-lg",
          active
            ? "bg-carbon-800 text-white"
            : "bg-gray-blue-900/6 text-carbon-800"
        )}
      >
        {icon}
      </div>
      <div>
        <div className="text-carbon-800 text-body-50 mb-0.5 font-medium">
          {title}
        </div>
        <span className="text-gray-blue-900/65 text-caption-20 block leading-relaxed">
          {sub}
        </span>
      </div>
      <div
        className={cn(
          "absolute top-4 right-4 flex size-4 items-center justify-center rounded-full border-[1.5px]",
          active ? "border-carbon-800" : "border-gray-blue-900/25"
        )}
      >
        {active && <span className="bg-carbon-800 size-2 rounded-full" />}
      </div>
    </button>
  );
}
