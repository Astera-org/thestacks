import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/stacks-ui/Popover";
import TokenField, {
  Token,
  tokenVariants,
} from "@/components/stacks-ui/TokenField";
import { Commit } from "@/hooks/use-edit-publication/types";
import { cn } from "@/lib/utils";
import { Check, ChevronDown } from "lucide-react";
import { KeyboardEvent, useId, useState } from "react";
import { PickerHeader, pickerItemClass } from "./PickerParts";

export default function TagEditor({
  disabled,
  invalid,
  locked,
  onCommit,
  suggested,
  tags,
  types,
}: {
  disabled?: boolean;
  invalid?: boolean;
  locked?: boolean;
  onCommit: Commit;
  suggested: string[];
  tags: string[];
  /** Pub types; the first tag matching one is pinned first as the classifier. */
  types: string[];
}) {
  const inputId = useId();
  const [value, setValue] = useState("");
  const [typeMenuOpen, setTypeMenuOpen] = useState(false);
  const readOnly = disabled || locked;

  const typeTag = tags.find((t) => types.includes(t));
  const freeTags = tags.filter((t) => t !== typeTag);

  const commitTags = (nextType: string | undefined, nextFree: string[]) =>
    onCommit({ tags: nextType ? [nextType, ...nextFree] : nextFree });

  const add = (raw: string) => {
    const tag = raw.trim();
    setValue("");
    if (!tag || tags.some((t) => t.toLowerCase() === tag.toLowerCase())) return;
    commitTags(typeTag, [...freeTags, tag]);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      add(value);
    } else if (e.key === "Backspace" && !value && freeTags.length > 0) {
      commitTags(typeTag, freeTags.slice(0, -1));
    }
  };

  return (
    <div className="w-full">
      <TokenField state={locked ? "locked" : invalid ? "invalid" : "default"}>
        {readOnly ? (
          typeTag && <Token locked={locked}>{typeTag}</Token>
        ) : (
          <Popover open={typeMenuOpen} onOpenChange={setTypeMenuOpen}>
            <PopoverTrigger asChild>
              <button
                aria-label={
                  typeTag ? `Pub type: ${typeTag}` : "Choose a pub type"
                }
                className={cn(
                  tokenVariants(),
                  "text-caption-20 gap-0 pr-1",
                  !typeTag && "text-fg-muted border-dashed"
                )}
                type="button"
              >
                {typeTag ?? "Pub type"}
                <span aria-hidden className="bg-border mx-2 h-3.5 w-px" />
                <ChevronDown aria-hidden className="size-3.5" />
              </button>
            </PopoverTrigger>
            <PopoverContent
              aria-label="Pub type"
              className="w-56 p-1.5"
              variant="light"
            >
              <PickerHeader meta="Pick one" title="Pub type" />
              <ul aria-label="Pub types">
                {types.map((type) => (
                  <li key={type}>
                    <button
                      aria-pressed={type === typeTag}
                      className={pickerItemClass}
                      type="button"
                      onClick={() => {
                        commitTags(
                          type === typeTag ? undefined : type,
                          freeTags
                        );
                        setTypeMenuOpen(false);
                      }}
                    >
                      <span
                        aria-hidden
                        className={cn(
                          "flex size-4 shrink-0 items-center justify-center rounded-full border",
                          type === typeTag
                            ? "bg-carbon-800 border-carbon-800 text-fg-inverted"
                            : "border-carbon-200"
                        )}
                      >
                        {type === typeTag && <Check className="size-2.5" />}
                      </span>
                      {type}
                    </button>
                  </li>
                ))}
              </ul>
            </PopoverContent>
          </Popover>
        )}

        {freeTags.map((tag) => (
          <Token
            key={tag}
            locked={locked}
            removeLabel={`Remove tag: ${tag}`}
            onRemove={
              readOnly
                ? undefined
                : () =>
                    commitTags(
                      typeTag,
                      freeTags.filter((t) => t !== tag)
                    )
            }
          >
            {tag}
          </Token>
        ))}

        {!readOnly && (
          <>
            <label className="sr-only" htmlFor={inputId}>
              Add a tag
            </label>
            <input
              className="text-body-30 md:text-body-20 text-fg placeholder:text-carbon-400 h-6.5 min-w-40 flex-1 bg-transparent px-1 outline-none"
              id={inputId}
              placeholder={
                freeTags.length
                  ? "Add another tag…"
                  : "Type a new tag and press enter…"
              }
              value={value}
              onBlur={() => add(value)}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={onKeyDown}
            />
          </>
        )}
      </TokenField>

      {!readOnly && suggested.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-caption-20 text-fg-muted font-mono">
            Suggested from your doc
          </span>
          {suggested
            .filter((t) => !tags.includes(t))
            .map((t) => (
              <button
                key={t}
                className={cn(tokenVariants(), "border-dashed")}
                type="button"
                onClick={() => add(t)}
              >
                + {t}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
