import { describe, expect, it } from "vitest";
import { safeUrl } from "./safeUrl";

describe("safeUrl", () => {
  it("keeps web, mail and relative URLs", () => {
    for (const url of [
      "https://example.org/a",
      "mailto:a@example.org",
      "#fig-1",
      "/pub/other",
      "./plot.png",
      "../plot.png",
      "plot.png",
      "other-page",
      "?view=full",
      "//example.org/a"
    ]) {
      expect(safeUrl(url)).toBe(url);
    }
  });

  it("refuses script and data URLs, however they are disguised", () => {
    for (const url of [
      "javascript:alert(1)",
      " JavaScript:alert(1)",
      "java\tscript:alert(1)",
      "data:text/html,<script>alert(1)</script>",
      "vbscript:msgbox(1)"
    ]) {
      expect(safeUrl(url)).toBeUndefined();
    }
  });

  it("allows inline images only when asked", () => {
    const png = "data:image/png;base64,AAAA";
    expect(safeUrl(png)).toBeUndefined();
    expect(safeUrl(png, { allowDataImage: true })).toBe(png);
  });
});
