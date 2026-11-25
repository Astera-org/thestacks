import { SearchIcon } from "@/components/icons";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

export function PickerHeader({
  title,
  meta,
}: {
  title: string;
  meta?: ReactNode;
}) {
  return (
    <div className="text-caption-20 text-fg-muted flex items-center justify-between gap-3 px-2 pt-1.5 pb-2 font-mono uppercase">
      <span>{title}</span>
      {meta && <span>{meta}</span>}
    </div>
  );
}

export function PickerSearch({
  label,
  onChange,
  placeholder,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  return (
    <div className="border-carbon-200 focus-within:border-gray-blue-900 mx-0.5 mb-1.5 flex items-center gap-2 rounded-md border px-2.5 transition-colors">
      <SearchIcon aria-hidden className="text-fg-muted size-3.5 shrink-0" />
      <input
        aria-label={label}
        className="text-body-30 md:text-body-20 text-fg placeholder:text-carbon-400 h-8 w-full bg-transparent outline-none"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

export function PickerSectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="text-caption-10 text-fg-muted px-2 pt-2 pb-1 font-mono uppercase">
      {children}
    </div>
  );
}

export const pickerItemClass = cn(
  "text-body-20 text-fg flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-gray-200 focus-visible:bg-gray-200 focus-visible:outline-none"
);
