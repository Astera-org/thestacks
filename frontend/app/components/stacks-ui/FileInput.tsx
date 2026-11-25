import Button from "@/components/stacks-ui/Button";
import { cn } from "@/lib/utils";
import * as React from "react";

type FileInputProps = Omit<
  React.ComponentProps<"input">,
  "type" | "value" | "onChange"
> & {
  ref?: React.Ref<HTMLInputElement>;
  label?: React.ReactNode;
  description?: React.ReactNode;
  error?: boolean | string;
  value?: File | null;
  onChange: (file: File | null) => void;
  /** Text on the trigger button. Defaults to "Choose file". */
  buttonLabel?: string;
  /** Icon rendered before the button label. */
  icon?: React.ReactNode;
  /** Extra classes for the trigger button, e.g. to restyle it per use site. */
  buttonClassName?: string;
  /** Set false to omit the "selected file name / No file chosen" text. */
  showFilename?: boolean;
};

function setRefs<T>(...refs: Array<React.Ref<T> | undefined>) {
  return (node: T | null) => {
    for (const ref of refs) {
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    }
  };
}

/**
 * A file input styled to match {@link Input}/{@link Textarea}, without the
 * native "Choose File / No file chosen" browser chrome. The real `<input
 * type="file">` stays in the DOM (for its change/blur events and any
 * forwarded ref) but is visually hidden; the button is the only visible,
 * focusable control, and forwards clicks to it.
 */
export default function FileInput({
  ref,
  id,
  label,
  description,
  error,
  value,
  onChange,
  disabled,
  buttonLabel = "Choose file",
  icon,
  buttonClassName,
  showFilename = true,
  className,
  ...props
}: FileInputProps) {
  const generatedId = React.useId();
  const inputId = id ?? generatedId;
  const triggerId = `${inputId}-trigger`;
  const messageId = `${inputId}-message`;

  const hasError = Boolean(error);
  const message = typeof error === "string" && error ? error : description;

  const inputRef = React.useRef<HTMLInputElement>(null);

  return (
    <div className="flex min-w-0 flex-col gap-2">
      {label && (
        <label
          htmlFor={triggerId}
          className="text-body-30 text-carbon-500 font-sans"
        >
          {label}
        </label>
      )}

      <div className="flex min-w-0 items-center gap-3">
        <Button
          id={triggerId}
          type="button"
          intent="secondary"
          pill={false}
          disabled={disabled}
          aria-invalid={hasError || undefined}
          aria-describedby={message ? messageId : undefined}
          onClick={() => inputRef.current?.click()}
          className={buttonClassName}
        >
          {icon ? (
            <span className="flex items-center gap-2">
              {icon}
              {buttonLabel}
            </span>
          ) : (
            buttonLabel
          )}
        </Button>
        {showFilename && (
          <span className="text-body-30 text-fg-muted min-w-0 flex-1 truncate font-sans">
            {value ? value.name : "No file chosen"}
          </span>
        )}
      </div>

      <input
        ref={setRefs(inputRef, ref)}
        id={inputId}
        type="file"
        disabled={disabled}
        aria-invalid={hasError || undefined}
        aria-describedby={message ? messageId : undefined}
        onChange={(e) => {
          onChange(e.target.files?.[0] ?? null);
          // Reset so selecting the same file again still fires onChange.
          e.target.value = "";
        }}
        className={cn("hidden", className)}
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
