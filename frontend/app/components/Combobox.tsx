import {
  Popover,
  PopoverContent,
  PopoverItem
} from "@/components/stacks-ui/Popover";
import { cn } from "@/lib/utils";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import {
  ComponentProps,
  ForwardedRef,
  forwardRef,
  InputHTMLAttributes,
  ReactNode,
  useId,
  useRef,
  useState
} from "react";
import GenericInput from "../pages/publications/[slug]/change/components/GenericInput";

export interface ComboboxOption<T> {
  key: string;
  label: ReactNode;
  value: T;
  disabled?: boolean;
}

export interface ComboboxHandle {
  focus: () => void;
}

export interface ComboboxProps<T> extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "onSelect"
> {
  className?: string;
  inputContainerClassName?: ComponentProps<
    typeof GenericInput
  >["containerClassName"];
  disabled?: boolean;
  emptyMessage?: ReactNode;
  iconLeft?: ComponentProps<typeof GenericInput>["iconLeft"];
  iconRight?: ComponentProps<typeof GenericInput>["iconRight"];
  inputClassName?: string;
  items: ComboboxOption<T>[];
  loading?: boolean;
  onBlur?: ComponentProps<typeof GenericInput>["onBlur"];
  onQueryChange: (value: string) => void;
  onSelect: (value: T, option: ComboboxOption<T>) => void;
  placeholder?: string;
  listItemRenderer?: (item: ComboboxOption<T>) => ReactNode;
  query: string;
  refocusOnSelect?: boolean;
  showPanelWithEmptyQuery?: boolean;
}

/** Finds the next non-disabled option index in `direction`, wrapping around. */
function nextEnabledIndex<T>(
  item: ComboboxOption<T>[],
  from: number,
  direction: 1 | -1
): number {
  if (item.length === 0) return -1;
  for (let step = 1; step <= item.length; step++) {
    const idx =
      (((from + direction * step) % item.length) + item.length) % item.length;
    if (!item[idx].disabled) return idx;
  }
  return -1;
}

/**
 * A text input that shows a floating list of suggestions as the user types,
 * built on {@link GenericInput} for the field and the {@link Popover}
 * primitives for the floating panel. The query and its results are fully
 * controlled by the caller (`query`/`onQueryChange`/`items`) so this
 * component owns only open/highlight state and keyboard navigation.
 */
function Component<T>(
  {
    className,
    inputContainerClassName: containerClassName,
    disabled,
    emptyMessage,
    iconLeft,
    iconRight,
    id,
    inputClassName,
    items,
    loading,
    onBlur,
    onQueryChange,
    onSelect,
    placeholder,
    listItemRenderer,
    query,
    refocusOnSelect = true,
    showPanelWithEmptyQuery = false
  }: ComboboxProps<T>,
  ref: ForwardedRef<ComboboxHandle>
) {
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [localQueryValue, setLocalQueryValue] = useState<string>(query);
  const containerRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  // Reset the highlight whenever the option set changes (e.g. new search
  // results). Done during render, not an effect, per
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  const [prevItems, setPrevItems] = useState(items);
  if (prevItems !== items) {
    setPrevItems(items);
    setHighlightedIndex(items.length > 0 ? 0 : -1);
  }

  const showPanel = open && (loading || items.length > 0 || !!emptyMessage);

  const selectOption = (option: ComboboxOption<T>) => {
    if (option.disabled) return;
    onSelect(option.value, option);
    setOpen(false);
    if (refocusOnSelect) {
      containerRef.current?.querySelector("input")?.focus();
    }
  };

  return (
    <Popover open={showPanel} onOpenChange={setOpen}>
      <PopoverPrimitive.Anchor asChild>
        <div
          ref={containerRef}
          className={className}
          onFocus={() => setOpen(true)}
        >
          <GenericInput
            ref={ref}
            aria-activedescendant={
              highlightedIndex >= 0
                ? `${listboxId}-option-${highlightedIndex}`
                : undefined
            }
            aria-autocomplete="list"
            aria-controls={listboxId}
            aria-expanded={showPanel}
            className={inputClassName}
            containerClassName={containerClassName}
            disabled={disabled}
            iconLeft={iconLeft}
            iconRight={iconRight}
            id={id}
            placeholder={placeholder}
            role="combobox"
            value={query}
            onBlur={(e) => {
              // A consumer's onBlur can react by unmounting/replacing this
              // component (e.g. UserSelect swaps back to its "selected"
              // chip on blur) — but clicking a PopoverItem fires the
              // input's blur *before* its click, since mousedown shifts
              // focus off the input first. Forwarding every blur would let
              // that unmount happen mid-click, dropping the selection. So
              // only forward it once focus has truly left the whole
              // widget: check the input's own container plus the results
              // panel, which is portaled elsewhere in the DOM (not a
              // descendant of `containerRef`), hence the separate
              // id-based lookup.
              const next = e.relatedTarget as Node | null;
              const stillInWidget =
                !!containerRef.current?.contains(next) ||
                !!document.getElementById(listboxId)?.contains(next);
              if (!stillInWidget) onBlur?.(e);
            }}
            onChangeValue={(v) => {
              onQueryChange(v);
              setLocalQueryValue(v);
              setOpen(true);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setOpen(true);
                setHighlightedIndex((i) => nextEnabledIndex(items, i, 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setOpen(true);
                setHighlightedIndex((i) => nextEnabledIndex(items, i, -1));
              } else if (e.key === "Enter") {
                if (showPanel && highlightedIndex >= 0) {
                  e.preventDefault();
                  selectOption(items[highlightedIndex]);
                }
              } else if (e.key === "Escape") {
                e.preventDefault();
                setOpen(false);
                onQueryChange("");
                setLocalQueryValue("");
                e.currentTarget.blur();
              }
            }}
          />
        </div>
      </PopoverPrimitive.Anchor>
      {(localQueryValue.length > 0 || showPanelWithEmptyQuery) && (
        <PopoverContent
          align="start"
          className="max-h-64 w-(--radix-popover-trigger-width) overflow-y-auto"
          id={listboxId}
          role="listbox"
          onCloseAutoFocus={(e) => e.preventDefault()}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          {loading ? (
            <div className="text-caption-40 text-gray-blue-300 px-3 py-1.5">
              Loading…
            </div>
          ) : items.length === 0 ? (
            <div className="text-caption-40 text-gray-blue-300 px-3 py-1.5">
              {emptyMessage}
            </div>
          ) : (
            items.map((option, index) => (
              <PopoverItem
                key={option.key}
                aria-selected={index === highlightedIndex}
                className={cn(
                  index === highlightedIndex && "bg-menu-hover",
                  option.disabled && "cursor-not-allowed opacity-50"
                )}
                disabled={option.disabled}
                id={`${listboxId}-option-${index}`}
                role="option"
                onClick={() => selectOption(option)}
                onMouseEnter={() => setHighlightedIndex(index)}
              >
                {listItemRenderer ? listItemRenderer(option) : option.label}
              </PopoverItem>
            ))
          )}
        </PopoverContent>
      )}
    </Popover>
  );
}
const Combobox = forwardRef(Component) as <T>(
  props: ComboboxProps<T> & { ref?: React.Ref<ComboboxHandle> }
) => ReturnType<typeof Component>;

export default Combobox;
