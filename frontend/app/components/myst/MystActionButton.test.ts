import { describe, expect, it } from "vitest";
import { isFigureActionButton } from "./MystActionButton";

describe("isFigureActionButton", () => {
  it("matches the figure-action-btn class among others", () => {
    expect(isFigureActionButton("figure-action-btn")).toBe(true);
    expect(isFigureActionButton("foo figure-action-btn bar")).toBe(true);
  });

  it("returns false for other buttons or a missing className", () => {
    expect(isFigureActionButton("some-other-btn")).toBe(false);
    expect(isFigureActionButton("")).toBe(false);
    expect(isFigureActionButton(undefined)).toBe(false);
  });

  it("does not match on a partial class name", () => {
    expect(isFigureActionButton("figure-action-btn-extra")).toBe(false);
  });
});
