import Tooltip from "@/components/stacks-ui/Tooltip";
import { cn } from "@/lib/utils";
import type { SVGProps } from "react";

export interface SegmentedControlOption<T extends string> {
  value: T;
  /** Sentence-case name of the option, e.g. "Card view". Also its accessible name. */
  label: string;
  icon: (props: SVGProps<SVGSVGElement>) => React.ReactNode;
}

interface SegmentedControlProps<T extends string> {
  options: SegmentedControlOption<T>[];
  value: T;
  onValueChange: (value: T) => void;
  /** Names the group for assistive tech, e.g. "Publication view". */
  label: string;
  className?: string;
}

/**
 * Icon-only segmented control for picking one of a few mutually exclusive
 * options. The filled dark segment is the one you are on, so the segments
 * sitting on the canvas read as what is left to click. `aria-pressed` and the
 * tooltip carry the same state for anyone the fill does not reach.
 */
export default function SegmentedControl<T extends string>(
  props: SegmentedControlProps<T>
) {
  const { options, value, onValueChange, label, className } = props;

  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        "border-border-strong bg-surface flex items-center gap-1 rounded-lg border p-1",
        className
      )}
    >
      {options.map((option) => {
        const { icon: Icon, label: optionLabel } = option;
        const isActive = option.value === value;

        return (
          <Tooltip
            key={option.value}
            label={
              isActive
                ? `${optionLabel}, current`
                : `Switch to ${optionLabel.toLowerCase()}`
            }
          >
            <button
              type="button"
              aria-label={optionLabel}
              aria-pressed={isActive}
              onClick={() => onValueChange(option.value)}
              className={cn(
                "flex h-9 w-12 items-center justify-center rounded-md transition-colors duration-200 ease-out",
                isActive
                  ? "bg-primary text-fg-inverted"
                  : "text-fg-muted hover:bg-gray-300"
              )}
            >
              <Icon className="pointer-events-none size-5" />
            </button>
          </Tooltip>
        );
      })}
    </div>
  );
}
