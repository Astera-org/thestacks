import { RefObject, useCallback, useEffect, useRef, useState } from "react";

type UseSyncedFieldValueReturnType<
  TValue extends string,
  TRef extends HTMLInputElement | HTMLTextAreaElement
> = {
  /**
   * The componentRef should be passed directly on the input as
   * `ref={componentRef}`. This detects when the reference has been populated
   * and will set the default value. This prevents issues with `cmd`+`z` in
   * chrome on MacOS.
   */
  componentRef: (node: TRef | null) => void;
  /**
   * To actually manipulate the input element, use the `accessRef`. This can
   * be used for things like `accessRef.focus()` for example.
   */
  accessRef: RefObject<TRef | null>;
  /**
   * In case your component needs to know the current local value, you should
   * use this value as it will be the most up to date.
   */
  localValue: TValue;
  /**
   * This handler should go on the `onChange` prop of your input component in
   * order to emit the value to your callback.
   */
  handleChange: (newValue: TValue) => void;
  /**
   * This handler should go on the `onFocus` prop of your input component in
   * order to keep prevent the input's value being changed while the user is
   * actively focused on the input.
   */
  handleFocus: () => void;
  /**
   * This handler should go on the `onBlur` prop of your input component in
   * order to refresh the component's value when the user removes focus from
   * the input.
   */
  handleBlur: () => void;
};

export type FieldTransform<TValue extends string> = (
  raw: string,
  caret: number
) => { value: TValue; caret: number };

/**
 * This hook is to be used with inputs that will automatically send a mutation
 * to the server on change. Under default behavior with `useQuery` there is a
 * race condition before the value is updated and the cursor position is lost.
 *
 * This hook ensures that the local value is maintained until the user leaves
 * (blurs) the field.
 *
 * It also helps prevent weirdness around cmd+z, although there is still a small
 * issue around that with chromium + macos.
 *
 * The `componentRef` should consumed directly as `ref={componentRef}` by the
 * input field itself, as it detects when the field is mounted and will apply
 * the correct default value.
 */
export function useSyncedFieldValue<
  /**
   * Note: We could use generic values for TValue but we'd need to update how we
   * work with the onchange handler.
   */
  TValue extends string,
  TRef extends HTMLInputElement | HTMLTextAreaElement
>(
  externalValue: TValue,
  onLocalChange: (v: TValue) => void,
  transform?: FieldTransform<TValue>
): UseSyncedFieldValueReturnType<TValue, TRef> {
  const [localValue, setLocalValue] = useState<TValue>(externalValue);
  const fieldRef = useRef<TRef>(null);
  const isFocused = useRef(false);
  const externalValueRef = useRef<TValue>(externalValue);
  const onLocalChangeRef = useRef(onLocalChange);
  const transformRef = useRef(transform);

  // Keep the latest callback available without ever touching the DOM.
  useEffect(() => {
    onLocalChangeRef.current = onLocalChange;
  }, [onLocalChange]);

  useEffect(() => {
    externalValueRef.current = externalValue;
    if (
      !isFocused.current &&
      fieldRef.current &&
      fieldRef.current.value !== externalValue
    ) {
      fieldRef.current.value = externalValue;
    }
  }, [externalValue]);

  const handleChange = useCallback((rawValue: string) => {
    const el = fieldRef.current;
    const transform = transformRef.current;

    if (!transform || !el) {
      setLocalValue(rawValue as TValue);
      onLocalChangeRef.current(rawValue as TValue);
      return;
    }

    const caret = el.selectionStart ?? rawValue.length;
    const next = transform(rawValue, caret);

    // Only touch the DOM when the transform actually changed something.
    if (next.value !== rawValue) {
      el.value = next.value;
      el.setSelectionRange(next.caret, next.caret);
    } else if (next.caret !== caret) {
      el.setSelectionRange(next.caret, next.caret);
    }

    setLocalValue(next.value);
    onLocalChangeRef.current(next.value);
  }, []);

  const handleFocus = useCallback(() => {
    isFocused.current = true;
  }, []);

  const handleBlur = useCallback(() => {
    isFocused.current = false;
    // catch up to whatever accumulated externally while focused
    if (
      fieldRef.current &&
      fieldRef.current.value !== externalValueRef.current
    ) {
      fieldRef.current.value = externalValueRef.current;
      setLocalValue(externalValueRef.current);
    }
  }, [setLocalValue]);

  // Assign value + native oninput exactly once, when the node is created.
  // Never reassigned due to callback identity changes.
  const inputRefCallback = useCallback((node: TRef | null) => {
    if (node !== null) {
      fieldRef.current = node;
      node.value = externalValueRef.current;
    } else {
      if (fieldRef.current) {
        fieldRef.current.oninput = null;
      }
      fieldRef.current = null;
    }
  }, []);

  return {
    componentRef: inputRefCallback,
    accessRef: fieldRef,
    localValue,
    handleChange,
    handleFocus,
    handleBlur
  };
}
