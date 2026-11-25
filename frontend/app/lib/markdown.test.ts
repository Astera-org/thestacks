import { describe, expect, it } from "vitest";
import { markdownToText, markdownToTextSync } from "./markdown";

describe("markdownToTextSync", () => {
  it("strips bold formatting", () => {
    expect(markdownToTextSync("Hello **world**")).toBe("Hello world");
  });

  it("strips italic formatting", () => {
    expect(markdownToTextSync("Hello _world_")).toBe("Hello world");
  });

  it("strips headings", () => {
    expect(markdownToTextSync("# Heading\n\nBody text")).toBe(
      "Heading\n\nBody text"
    );
  });

  it("strips links, keeping the link text", () => {
    expect(markdownToTextSync("See [the docs](https://example.com)")).toBe(
      "See the docs"
    );
  });

  it("strips Markdown formatting without escaping literal characters", () => {
    expect(
      markdownToTextSync("Hello **world** with _emphasis_ and `code`")
    ).toBe("Hello world with emphasis and code");
    expect(markdownToTextSync("Title with under_score and a*b")).toBe(
      "Title with under_score and a*b"
    );
  });

  it("strips HTML tags while keeping their text content", () => {
    expect(markdownToTextSync("<b>Bold</b> and <i>italic</i>")).toBe(
      "Bold and italic"
    );
  });

  it("normalizes to NFC", () => {
    const decomposed = "cafe\u0301"; // "e" + combining acute accent (U+0301)
    const composed = "caf\u00e9"; // precomposed "e with acute" (U+00E9)
    // Confirm these two representations are actually different before
    // normalization, otherwise the assertion below would not prove anything.
    expect(decomposed).not.toEqual(composed);
    expect(decomposed.normalize("NFC")).toBe(composed);

    expect(markdownToTextSync(decomposed)).toBe(composed);
  });

  it("leaves empty strings untouched", () => {
    expect(markdownToTextSync("")).toBe("");
  });

  it("normalizes non-breaking spaces to regular spaces", () => {
    // Non-breaking spaces are sometimes used to glue italicized species
    // names together (e.g. "C.\u00A0elegans") so they don't wrap across a
    // line. They aren't Markdown syntax, so the strip pipeline leaves them
    // untouched; finalizeMarkdownToText should still normalize them so
    // downstream plain-text consumers see genuine spaces.
    expect(
      markdownToTextSync("high-throughput _C.\u00A0elegans_\u00A0imaging")
    ).toBe("high-throughput C. elegans imaging");
  });

  it("trims surrounding whitespace", () => {
    expect(markdownToTextSync("  Hello world  \n")).toBe("Hello world");
  });
});

describe("markdownToText", () => {
  it("matches the sync implementation", async () => {
    expect(await markdownToText("Hello **world** with under_score")).toBe(
      markdownToTextSync("Hello **world** with under_score")
    );
  });

  it("leaves empty strings untouched", async () => {
    expect(await markdownToText("")).toBe("");
  });
});
