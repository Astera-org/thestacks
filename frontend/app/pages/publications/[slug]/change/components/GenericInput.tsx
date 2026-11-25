import IconButton from "@/components/stacks-ui/IconButton";
import {
  FieldTransform,
  useSyncedFieldValue,
} from "@/hooks/useSyncedFieldValue";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import {
  forwardRef,
  InputHTMLAttributes,
  MouseEventHandler,
  ReactNode,
  useCallback,
  useId,
  useImperativeHandle,
  useState,
} from "react";
import FieldError from "./FieldError";

export interface GenericInputHandle {
  focus: () => void;
}

interface InputIconProps {
  Icon: LucideIcon;
  /** Accessible name; required when the icon is a button. */
  label?: string;
  className?: string;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  onClickChangeText?: (currentValue: string) => string;
}

export interface GenericInputProps extends InputHTMLAttributes<HTMLInputElement> {
  containerClassName?: string;
  error?: string | string[];
  iconLeft?: InputIconProps;
  iconRight?: InputIconProps;
  /** Rendered at the end of the field, e.g. a "Locked" badge. */
  trailing?: ReactNode;
  onChangeValue: (v: string) => void;
  /** A synchronous function for returning the correct value of the field after a change */
  transform?: FieldTransform<string>;
  validation?: (v: string) => string | string[] | null;
  value: string;
}

const defaultIconClass = "text-fg-muted";

export const GenericInput = forwardRef<GenericInputHandle, GenericInputProps>(
  (
    {
      className,
      containerClassName,
      error,
      iconLeft,
      iconRight,
      onChangeValue,
      placeholder,
      prefix,
      trailing,
      transform,
      validation,
      value,
      ...props
    },
    ref
  ) => {
    const [localError, setLocalError] = useState<string | string[] | null>(
      null
    );
    const { onBlur, onFocus, ...remainingProps } = props;
    const { disabled } = remainingProps;

    const onInputChange = useCallback(
      (v: string) => {
        onChangeValue(v);
        setLocalError(validation ? validation(v) : null);
      },
      [onChangeValue, setLocalError, validation]
    );

    const {
      componentRef,
      accessRef,
      handleChange,
      localValue,
      handleFocus,
      handleBlur,
    } = useSyncedFieldValue(value, onInputChange, transform);

    useImperativeHandle(ref, () => ({
      focus: () => accessRef.current?.focus(),
    }));

    // local validation wins if present, otherwise show whatever the server said
    const displayedError = localError ?? error;
    const hasError =
      (Array.isArray(displayedError) || typeof displayedError === "string") &&
      displayedError.length > 0;
    const errorId = useId();
    return (
      <div className="flex w-full flex-col gap-1.5">
        {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- pointer-only convenience that focuses the nested <input>; keyboard/AT users already tab directly to that native, fully-operable control, so making this wrapper its own focusable/interactive element would just add a redundant tab stop */}
        <div
          className={cn(
            "flex h-13 items-center gap-2.5 rounded-lg border transition-colors",
            disabled
              ? "border-carbon-100 cursor-default bg-gray-100"
              : "border-carbon-200 hover:border-gray-blue-900 focus-within:border-gray-blue-900 bg-surface",
            hasError && "border-error-800",
            iconLeft && iconLeft.onClick ? "pl-2" : "pl-4",
            iconRight && iconRight.onClick ? "pr-2" : "pr-4",
            containerClassName
          )}
          onClick={() => {
            if (accessRef.current) accessRef.current.focus();
          }}
        >
          {iconLeft && (
            <InputIcon
              {...iconLeft}
              disabled={disabled}
              localValue={localValue}
              onInputChange={onInputChange}
            />
          )}
          <div className="flex min-w-0 flex-1 flex-row items-center gap-2">
            {prefix && (
              <span className="text-body-20 text-gray-blue-400 font-mono">
                {prefix}
              </span>
            )}
            <input
              ref={componentRef}
              aria-describedby={hasError ? errorId : undefined}
              aria-invalid={hasError || undefined}
              className={cn(
                "text-body-30 text-fg placeholder:text-carbon-400 disabled:text-carbon-400 min-w-0 flex-1 bg-transparent font-sans outline-none disabled:cursor-default",
                className
              )}
              placeholder={placeholder}
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
          </div>
          {trailing}
          {iconRight && (
            <InputIcon
              {...iconRight}
              disabled={disabled}
              localValue={localValue}
              onInputChange={onInputChange}
            />
          )}
        </div>
        <FieldError id={errorId} message={displayedError} />
      </div>
    );
  }
);

function InputIcon({
  className,
  disabled,
  label,
  localValue,
  Icon,
  onClick,
  onClickChangeText,
  onInputChange,
}: InputIconProps & {
  disabled?: boolean;
  localValue: string;
  onInputChange: (newValue: string) => void;
}) {
  if (!onClick && !onClickChangeText) {
    return (
      <Icon
        aria-hidden
        className={cn(defaultIconClass, "size-4 shrink-0", className)}
      />
    );
  }

  return (
    <IconButton
      aria-label={label}
      disabled={disabled}
      icon={
        <Icon
          aria-hidden
          className={cn(defaultIconClass, "size-4", className)}
        />
      }
      intent="ghost"
      size="xs"
      onClick={(e) => {
        onClick?.(e);
        if (onClickChangeText) {
          onInputChange(onClickChangeText(localValue));
        }
      }}
    />
  );
}

export default GenericInput;
