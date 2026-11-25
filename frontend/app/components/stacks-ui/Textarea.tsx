import { cn } from "@/lib/utils";
import * as React from "react";

type TextareaProps = React.ComponentProps<"textarea"> & {
  ref?: React.Ref<HTMLTextAreaElement>;
  label?: React.ReactNode;
  description?: React.ReactNode;
  error?: boolean | string;
};

export default function Textarea({
  ref,
  id,
  label,
  description,
  error,
  className,
  disabled,
  ...props
}: TextareaProps) {
  const generatedId = React.useId();
  const textareaId = id ?? generatedId;
  const messageId = `${textareaId}-message`;

  const hasError = Boolean(error);
  const message = typeof error === "string" && error ? error : description;

  const innerRef = React.useRef<HTMLTextAreaElement>(null);
  React.useImperativeHandle(ref, () => innerRef.current!);

  // Grow with the content.
  React.useEffect(() => {
    const textarea = innerRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [props.value]);

  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label
          htmlFor={textareaId}
          className="text-body-30 text-carbon-500 font-sans"
        >
          {label}
        </label>
      )}

      <textarea
        ref={innerRef}
        id={textareaId}
        disabled={disabled}
        aria-invalid={hasError || undefined}
        aria-describedby={message ? messageId : undefined}
        className={cn(
          "text-body-30 text-fg placeholder:text-carbon-400 bg-surface min-h-32 w-full rounded-lg border px-4 py-3 font-sans transition-colors outline-none",
          disabled
            ? "border-carbon-100 text-carbon-500 cursor-not-allowed"
            : hasError
              ? "border-error-800"
              : "border-carbon-200 hover:border-gray-blue-900 focus:border-gray-blue-900",
          className
        )}
        {...props}
      />

      {message && (
        <p
          id={messageId}
          role={hasError && !disabled ? "alert" : undefined}
          className={cn(
            "text-body-20 font-sans",
            hasError && !disabled ? "text-error-800" : "text-carbon-500"
          )}
        >
          {message}
        </p>
      )}
    </div>
  );
}
