import { useEffect } from "react";

const KEYBOARD_FOCUS_ATTR = "data-keyboard-focus";

/**
 * Toggles `html[data-keyboard-focus]` so base CSS shows focus rings only after
 * Tab navigation. Browsers can match `:focus-visible` on pointer focus for text
 * fields (and inconsistently for buttons in Safari), so we gate the global ring
 * on this attribute to keep it keyboard-only.
 */
export function KeyboardFocusMode() {
  useEffect(() => {
    const root = document.documentElement;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Tab") {
        root.setAttribute(KEYBOARD_FOCUS_ATTR, "");
      }
    };

    const onPointerDown = () => {
      root.removeAttribute(KEYBOARD_FOCUS_ATTR);
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, []);

  return null;
}
