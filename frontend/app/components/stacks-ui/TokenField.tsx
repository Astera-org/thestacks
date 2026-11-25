import { AddIcon, CloseIcon } from "@/components/icons";
import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps, ReactNode } from "react";

const fieldVariants = cva(
  "flex min-h-11 w-full flex-wrap items-center gap-1.5 rounded-lg border px-2.5 py-1.5 transition-colors",
  {
    variants: {
      state: {
        default:
          "bg-gray-200 border-gray-blue-900/10 focus-within:border-gray-blue-900/35",
        active: "bg-gray-200 border-gray-blue-900/35",
        locked: "bg-gray-200 border-transparent",
        invalid: "bg-surface border-error-800"
      }
    },
    defaultVariants: { state: "default" }
  }
);

interface TokenFieldProps
  extends ComponentProps<"div">, VariantProps<typeof fieldVariants> {}

/**
 * The grey "well" that holds a wrapping list of {@link Token}s, shared by tags,
 * CRediT roles and affiliations so the three read as one component family.
 */
export default function TokenField(props: TokenFieldProps) {
  const { className, state, ...rest } = props;
  return <div className={cn(fieldVariants({ state }), className)} {...rest} />;
}

export const tokenVariants = cva(
  "text-caption-10 inline-flex h-6.5 max-w-full min-w-0 items-center gap-1 rounded-lg border px-2 font-mono transition-colors select-none",
  {
    variants: {
      locked: {
        false:
          "bg-surface border-gray-blue-900/15 text-carbon-800 hover:border-gray-blue-900/30 shadow-xs",
        true: "bg-gray-300 border-transparent text-fg-muted"
      }
    },
    defaultVariants: { locked: false }
  }
);

interface TokenProps extends ComponentProps<"span"> {
  locked?: boolean;
  /** Shows a remove (×) button when provided and the token is not locked. */
  onRemove?: () => void;
  removeLabel?: string;
  /** Rendered after the label, outside its truncation, so it is never clipped. */
  suffix?: ReactNode;
  children: ReactNode;
}

export function Token(props: TokenProps) {
  const {
    className,
    locked,
    onRemove,
    removeLabel,
    suffix,
    children,
    ...rest
  } = props;

  return (
    <span className={cn(tokenVariants({ locked }), className)} {...rest}>
      <span className="truncate">{children}</span>
      {suffix && <span className="shrink-0">{suffix}</span>}
      {onRemove && !locked && (
        <button
          type="button"
          aria-label={removeLabel}
          onClick={onRemove}
          className="text-fg-subtle hover:text-carbon-800 -mr-2 -ml-1 flex size-6 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-gray-200"
        >
          <CloseIcon className="size-3" />
        </button>
      )}
    </span>
  );
}

/** The dashed "+" that opens a field's picker. */
export function TokenAddButton(props: ComponentProps<"button">) {
  const { className, ...rest } = props;
  return (
    <button
      type="button"
      className={cn(
        "border-gray-blue-900/25 text-gray-blue-900/50 hover:border-gray-blue-900/50 hover:text-carbon-800 inline-flex h-6.5 min-w-6.5 shrink-0 items-center justify-center gap-2 rounded-lg border border-dashed px-1.5 transition-colors disabled:pointer-events-none disabled:opacity-50",
        className
      )}
      {...rest}
    >
      <AddIcon className="size-2.5" />
    </button>
  );
}

/** Lavender hint text shown inside an empty field. */
export function TokenFieldPlaceholder(props: ComponentProps<"span">) {
  const { className, ...rest } = props;
  return (
    <span
      className={cn("text-body-20 text-gray-blue-500 px-1", className)}
      {...rest}
    />
  );
}
