import { cn } from "@/lib/utils";
import * as SelectPrimitive from "@radix-ui/react-select";
import { cva, type VariantProps } from "class-variance-authority";
import { Check, ChevronDown } from "lucide-react";

const triggerVariants = cva(
  "text-fg data-placeholder:text-carbon-400 hover:border-gray-blue-900 focus-visible:border-gray-blue-900 flex w-full items-center justify-between gap-3 rounded-lg border border-carbon-200 bg-surface font-sans outline-none transition-colors disabled:cursor-not-allowed disabled:border-carbon-100 disabled:text-carbon-500 [&>span]:truncate",
  {
    variants: {
      size: {
        sm: "text-body-20 h-9 px-3",
        md: "text-body-30 h-13 px-4"
      }
    },
    defaultVariants: { size: "md" }
  }
);

export interface SelectOption<T extends string> {
  value: T;
  label: string;
  disabled?: boolean;
}

interface SelectProps<T extends string> extends VariantProps<
  typeof triggerVariants
> {
  options: SelectOption<T>[];
  value: T | undefined;
  onValueChange: (value: T) => void;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
  "aria-label"?: string;
  "aria-invalid"?: boolean;
}

/** Light single-value select that matches {@link Input}. */
export default function Select<T extends string>(props: SelectProps<T>) {
  const {
    options,
    value,
    onValueChange,
    placeholder,
    disabled,
    id,
    className,
    size,
    "aria-label": ariaLabel,
    "aria-invalid": ariaInvalid
  } = props;

  return (
    <SelectPrimitive.Root
      value={value}
      onValueChange={(v) => onValueChange(v as T)}
      disabled={disabled}
    >
      <SelectPrimitive.Trigger
        id={id}
        aria-label={ariaLabel}
        aria-invalid={ariaInvalid || undefined}
        className={cn(triggerVariants({ size }), className)}
      >
        <SelectPrimitive.Value placeholder={placeholder} />
        <SelectPrimitive.Icon asChild>
          <ChevronDown className="text-fg-strong size-4 shrink-0" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>

      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={6}
          className="bg-surface border-border text-fg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 z-[300] max-h-(--radix-select-content-available-height) w-(--radix-select-trigger-width) min-w-44 overflow-y-auto rounded-xl border p-1.5 font-sans shadow-xl motion-reduce:animate-none"
        >
          <SelectPrimitive.Viewport>
            {options.map((option) => (
              <SelectPrimitive.Item
                key={option.value}
                value={option.value}
                disabled={option.disabled}
                className="text-body-20 flex cursor-pointer items-center justify-between gap-3 rounded-md px-2.5 py-2 outline-none select-none data-disabled:cursor-default data-disabled:opacity-40 data-highlighted:bg-gray-200"
              >
                <SelectPrimitive.ItemText>
                  {option.label}
                </SelectPrimitive.ItemText>
                <SelectPrimitive.ItemIndicator>
                  <Check className="size-3.5" />
                </SelectPrimitive.ItemIndicator>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
