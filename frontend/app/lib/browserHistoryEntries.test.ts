import { afterEach, describe, expect, it, vi } from "vitest";
import { keyBrowserHistoryEntries } from "./browserHistoryEntries";

describe("keyBrowserHistoryEntries", () => {
  afterEach(() => {
    vi.useRealTimers();
    delete document.documentElement.dataset.instantScroll;
  });

  it("keys the current entry and keeps its state", () => {
    window.history.replaceState({ idx: 0 }, "");
    keyBrowserHistoryEntries();

    expect(window.history.state).toMatchObject({ idx: 0 });
    expect(window.history.state.key).toEqual(expect.any(String));
  });

  it("keys entries the browser creates and jumps to their hash", () => {
    vi.useFakeTimers();
    keyBrowserHistoryEntries();

    window.history.pushState(null, "", "#methods");
    window.dispatchEvent(new PopStateEvent("popstate"));

    expect(window.history.state.key).toEqual(expect.any(String));
    expect(document.documentElement.dataset.instantScroll).toBe("");
    vi.runAllTimers();
    expect(document.documentElement.dataset.instantScroll).toBeUndefined();
  });

  it("leaves entries React Router created alone", () => {
    keyBrowserHistoryEntries();

    window.history.pushState({ key: "router-key", idx: 1 }, "", "#results");
    window.dispatchEvent(new PopStateEvent("popstate"));

    expect(window.history.state).toEqual({ key: "router-key", idx: 1 });
    expect(document.documentElement.dataset.instantScroll).toBeUndefined();
  });
});
