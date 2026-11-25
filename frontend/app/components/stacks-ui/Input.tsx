import { cn } from "@/lib/utils";
import { Eye, EyeOff } from "lucide-react";
import * as React from "react";

type InputProps = Omit<React.ComponentProps<"input">, "size"> & {
  ref?: React.Ref<HTMLInputElement>;
  label?: React.ReactNode;
  /**
   * Shown next to the label (e.g. a "Forgot password?" link), not inside it.
   * Placed after the input in DOM order so it is tabbed to after the field.
   */
  labelAction?: React.ReactNode;
  description?: React.ReactNode;
  error?: boolean | string;
  trailing?: React.ReactNode;
};

export default function Input({
  ref,
  id,
  type = "text",
  label,
  labelAction,
  description,
  error,
  trailing,
  className,
  disabled,
  ...props
}: InputProps) {
  const generatedId = React.useId();
  const inputId = id ?? generatedId;
  const messageId = `${inputId}-message`;

  const hasError = Boolean(error);
  const message = typeof error === "string" && error ? error : description;

  const isPassword = type === "password";
  const [showPassword, setShowPassword] = React.useState(false);
  const resolvedType = isPassword && showPassword ? "text" : type;

  return (
    // Grid so labelAction can sit visually in the label row while coming after
    // the input in DOM (and therefore tab) order.
    <div className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2">
      {label && (
        <label
          htmlFor={inputId}
          className="text-body-30 text-carbon-500 font-sans"
        >
          {label}
        </label>
      )}

      <div
        className={cn(
          "bg-surface col-span-2 flex h-13 w-full items-center rounded-lg border transition-colors",
          disabled
            ? "border-carbon-100 cursor-not-allowed"
            : hasError
              ? "border-error-800"
              : "border-carbon-200 hover:border-gray-blue-900 focus-within:border-gray-blue-900"
        )}
      >
        <input
          ref={ref}
          id={inputId}
          type={resolvedType}
          disabled={disabled}
          aria-invalid={hasError || undefined}
          aria-describedby={message ? messageId : undefined}
          className={cn(
            "text-body-30 text-fg placeholder:text-carbon-400 disabled:text-carbon-500 size-full bg-transparent px-4 font-sans outline-none disabled:cursor-not-allowed",
            className
          )}
          {...props}
        />

        {isPassword ? (
          <button
            type="button"
            disabled={disabled}
            onClick={() => setShowPassword((shown) => !shown)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="text-fg-muted hover:text-fg shrink-0 pe-4 transition-colors disabled:pointer-events-none"
          >
            {showPassword ? (
              <EyeOff className="size-5" />
            ) : (
              <Eye className="size-5" />
            )}
          </button>
        ) : (
          trailing
        )}
      </div>

      {labelAction && (
        <div className="col-start-2 row-start-1 justify-self-end">
          {labelAction}
        </div>
      )}

      {message && (
        <p
          id={messageId}
          role={hasError && !disabled ? "alert" : undefined}
          className={cn(
            "text-body-20 col-span-2 font-sans",
            hasError && !disabled ? "text-error-800" : "text-carbon-500"
          )}
        >
          {message}
        </p>
      )}
    </div>
  );
}
