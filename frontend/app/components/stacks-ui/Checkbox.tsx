import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

interface CheckboxProps extends Omit<ComponentProps<"input">, "type" | "size"> {
  /** Renders the native "mixed" state, e.g. a partially selected "select all". */
  indeterminate?: boolean;
  /** Cross-axis alignment with the label: "center" for one line, "start" for wrapping text. */
  align?: "start" | "center";
}

export default function Checkbox(props: CheckboxProps) {
  const {
    children,
    indeterminate = false,
    align = "start",
    className,
    ...rest
  } = props;

  const input = (
    <input
      type="checkbox"
      ref={(el) => {
        if (el) el.indeterminate = indeterminate;
      }}
      className={cn(
        "accent-gray-blue-900 size-4 shrink-0 cursor-pointer",
        className
      )}
      {...rest}
    />
  );

  // Bare input when there's no visible label; pair it with an `aria-label`.
  if (!children) {
    return input;
  }

  // Children are the caller-styled label. Clicks on links inside won't toggle.
  return (
    <label
      className={cn(
        "inline-flex cursor-pointer gap-2 select-none",
        align === "center" ? "items-center" : "items-start"
      )}
    >
      {input}
      {children}
    </label>
  );
}
