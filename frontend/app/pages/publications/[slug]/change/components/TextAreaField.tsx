import {
  FieldTransform,
  useSyncedFieldValue,
} from "@/hooks/useSyncedFieldValue";
import { cn } from "@/lib/utils";
import { TextareaHTMLAttributes } from "react";

export function TextAreaField({
  boxed,
  className,
  onChangeValue,
  transform,
  value,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & {
  /** Bordered field like GenericInput, instead of the seamless inline text. */
  boxed?: boolean;
  className?: string;
  onChangeValue: (v: string) => void;
  /** A synchronous function for returning the correct value of the field after a change */
  transform?: FieldTransform<string>;
  value: string;
}) {
  const { onBlur, onFocus, ...remainingProps } = props;
  const { componentRef, handleChange, handleFocus, handleBlur } =
    useSyncedFieldValue<string, HTMLTextAreaElement>(
      value,
      onChangeValue,
      transform
    );

  return (
    <textarea
      ref={componentRef}
      className={cn(
        "placeholder:text-carbon-400 field-sizing-content cursor-text resize-none transition-colors outline-none disabled:cursor-default",
        boxed
          ? "text-body-30 text-fg border-carbon-200 hover:border-gray-blue-900 focus:border-gray-blue-900 disabled:border-carbon-100 disabled:text-carbon-400 bg-surface rounded-lg border px-4 py-3 disabled:bg-gray-100"
          : "text-fg-strong -mx-2 rounded-md px-2 py-1 hover:not-focus:not-disabled:bg-gray-100 focus:bg-gray-200",
        className
      )}
      {...remainingProps}
      onBlur={(e) => {
        handleBlur();
        onBlur?.(e);
      }}
      onChange={(e) => handleChange(e.target.value)}
      onFocus={(e) => {
        handleFocus();
        onFocus?.(e);
      }}
    />
  );
}
