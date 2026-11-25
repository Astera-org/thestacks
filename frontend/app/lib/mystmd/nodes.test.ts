import { describe, expect, it } from "vitest";
import { hasClass } from "./nodes";

describe("hasClass", () => {
  it("matches one of several space-separated classes", () => {
    expect(hasClass({ class: "simple  dropdown" }, "dropdown")).toBe(true);
  });

  it("does not match a substring of a class", () => {
    expect(hasClass({ class: "dropdowns" }, "dropdown")).toBe(false);
  });

  it("is false when the node has no class", () => {
    expect(hasClass({}, "dropdown")).toBe(false);
  });
});
