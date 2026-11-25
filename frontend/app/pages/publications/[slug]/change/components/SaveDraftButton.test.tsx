import { SaveStatus } from "@/hooks/use-edit-publication/types";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CONFIRMATION_MS, SaveDraftButton } from "./SaveDraftButton";

function renderButton(
  props: Partial<{
    hasRejected: boolean;
    isDirty: boolean;
    status: SaveStatus;
  }> = {}
) {
  const onSave = vi.fn();
  const onRetry = vi.fn();
  const element = (next: typeof props) => (
    <SaveDraftButton
      hasRejected={next.hasRejected ?? false}
      isDirty={next.isDirty ?? false}
      status={next.status ?? "saved"}
      onRetry={onRetry}
      onSave={onSave}
    />
  );
  const { rerender } = render(element(props));
  return {
    button: () => screen.getByRole("button"),
    onRetry,
    onSave,
    rerender: (next: typeof props) => rerender(element(next)),
  };
}

afterEach(() => {
  vi.useRealTimers();
});

describe("SaveDraftButton", () => {
  it("confirms the draft is up to date when nothing changed", () => {
    vi.useFakeTimers();
    const { button, onSave } = renderButton();

    fireEvent.click(button());

    expect(onSave).not.toHaveBeenCalled();
    expect(button().textContent).toBe("Up to date");
    expect(screen.getByText("Up to date", { selector: "[aria-live]" }));

    act(() => vi.advanceTimersByTime(CONFIRMATION_MS));
    expect(button().textContent).toBe("Save draft");
  });

  it("saves unsaved changes, then confirms once they land", () => {
    const { button, onSave, rerender } = renderButton({
      isDirty: true,
      status: "saving",
    });

    fireEvent.click(button());

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(button().textContent).toBe("Saving…");
    expect(button().getAttribute("aria-busy")).toBe("true");

    rerender({ isDirty: false, status: "saved" });
    expect(button().textContent).toBe("Saved");
  });

  it("points at field errors instead of claiming everything is saved", () => {
    const { button } = renderButton({ hasRejected: true });

    fireEvent.click(button());

    expect(button().textContent).toBe("Check field errors");
  });

  it("retries a failed save", () => {
    const { button, onRetry, onSave } = renderButton({
      isDirty: true,
      status: "error",
    });
    expect(button().textContent).toBe("Retry save");

    fireEvent.click(button());

    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onSave).not.toHaveBeenCalled();
  });

  it("saves on Cmd/Ctrl+S and suppresses the browser dialog", () => {
    const { onSave } = renderButton({ isDirty: true, status: "saving" });

    const event = new KeyboardEvent("keydown", {
      key: "s",
      metaKey: true,
      cancelable: true,
    });
    act(() => {
      window.dispatchEvent(event);
    });

    expect(event.defaultPrevented).toBe(true);
    expect(onSave).toHaveBeenCalledTimes(1);
  });
});
