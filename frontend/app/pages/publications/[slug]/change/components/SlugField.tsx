import Button from "@/components/stacks-ui/Button";
import Chip from "@/components/stacks-ui/Chip";
import { cn } from "@/lib/utils";
import { RefreshCw } from "lucide-react";
import { useEffect, useId, useMemo, useState } from "react";
import FieldError from "./FieldError";
import { LockedBadge } from "./Row";
import { TextAreaField } from "./TextAreaField";

const MAX_SLUG_LENGTH = 255;

type ErrorMode = "TOO_LONG";

const KEEP = /^[a-z0-9]$/;
const SEP = /^[\s-]$/;

/**
 * Slugifies `raw` and maps `caret` (a code-unit offset into `raw`) to the
 * equivalent offset in the output.
 */
export function slugifyWithCaret(
  raw: string,
  caret: number
): { value: string; caret: number } {
  let out = "";
  let mapped = 0;

  for (let i = 0; i < raw.length; i++) {
    if (i === caret) mapped = out.length; // chars before the caret produced this much output
    const ch = raw[i];

    if (SEP.test(ch)) {
      out += "-";
    } else {
      // toLowerCase can expand a char (e.g. "İ"), so filter what comes out
      for (const c of ch.toLowerCase()) if (KEEP.test(c)) out += c;
    }
  }
  if (caret >= raw.length) mapped = out.length;

  return { value: out, caret: mapped };
}

/**
 * Component for changing the slug. Has local caching in the case that the user
 * inputs an invalid slug (e.g. too long), so that the input doesn't refresh
 * while it is in use.
 */
export default function SlugField({
  disabled,
  error,
  onChange,
  title,
  value,
}: {
  disabled?: boolean;
  error?: string;
  onChange: (v: string) => void;
  title: string;
  value: string;
}) {
  const errorId = useId();
  const [touched, setTouched] = useState(!!value);
  const [draft, setDraft] = useState(value);
  const [lengthError, setLengthError] = useState<ErrorMode | null>(null);
  const auto = useMemo(() => slugifyWithCaret(title ?? "", 0).value, [title]);
  const current = touched ? draft || auto : auto;

  // The server can store a different slug than the one sent (e.g. a free
  // variant of a taken slug). Adopt it, and leave auto mode so the effect
  // below does not keep re-sending the taken auto slug.
  const [syncedValue, setSyncedValue] = useState(value);
  if (value !== syncedValue) {
    setSyncedValue(value);
    if (value && value !== current && !lengthError) {
      setTouched(true);
      setDraft(value);
    }
  }

  useEffect(() => {
    if (!touched && current !== value) onChange(current);
  }, [current, touched, value, onChange]);

  return (
    <div className="w-full">
      <div
        className={cn(
          "flex min-h-13 items-center gap-3 rounded-lg border py-2 pr-2 pl-4 transition-colors",
          disabled
            ? "border-carbon-100 bg-gray-100"
            : error || lengthError
              ? "border-error-800 bg-surface"
              : "border-carbon-200 hover:border-gray-blue-900 focus-within:border-gray-blue-900 bg-surface"
        )}
      >
        <div className="text-body-20 flex min-w-0 flex-1 flex-wrap items-baseline font-mono">
          <span
            aria-hidden
            className="text-gray-blue-400 mr-2 whitespace-nowrap"
          >
            thestacks.org/publications/
          </span>
          <TextAreaField
            aria-describedby={error || lengthError ? errorId : undefined}
            aria-invalid={error || lengthError ? true : undefined}
            aria-label="Slug"
            className="text-body-30 md:text-body-20 text-fg disabled:text-fg mx-0 min-w-48 flex-1 bg-transparent px-0 py-0 font-mono wrap-break-word hover:bg-transparent focus:bg-transparent"
            disabled={disabled}
            placeholder="auto-generated-from-title"
            spellCheck={false}
            transform={slugifyWithCaret}
            value={current}
            onChangeValue={(raw) => {
              setTouched(true);
              const slug = slugifyWithCaret(raw, 0).value;
              setDraft(slug);

              if (slug.length <= MAX_SLUG_LENGTH) {
                setLengthError(null);
                onChange(slug);
              } else {
                setLengthError("TOO_LONG");
              }
            }}
          />
        </div>
        <div className="flex shrink-0 items-center">
          {disabled ? (
            <LockedBadge className="bg-gray-200" />
          ) : !touched ? (
            <Chip className="rounded-md" intent="muted" size="xs">
              auto
            </Chip>
          ) : (
            <Button
              className="min-h-7 gap-1.5 px-2.5 py-0"
              intent="outline"
              size="sm"
              onClick={() => {
                setTouched(false);
                setDraft(auto);
                setLengthError(null);
                onChange(auto);
              }}
            >
              <RefreshCw aria-hidden className="size-3" />
              Reset
            </Button>
          )}
        </div>
      </div>
      <FieldError id={errorId} message={error} />
      {draft.length > MAX_SLUG_LENGTH - 20 && (
        <div
          className={cn(
            "text-caption-20 text-fg-muted mt-1 text-right font-mono",
            lengthError === "TOO_LONG" && "text-error-900"
          )}
        >
          {draft.length} / {MAX_SLUG_LENGTH}
        </div>
      )}
    </div>
  );
}
