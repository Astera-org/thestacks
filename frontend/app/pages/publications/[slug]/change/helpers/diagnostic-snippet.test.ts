import { ImportUpload } from "@/apiv1/imports";
import { DiagnosticExcerptV1 } from "@/types/v1";
import { describe, expect, it } from "vitest";
import { buildSnippet, Snippet } from "./diagnostic-snippet";

// A stray `\:::` on line 7 of the imported body.
const excerpt: DiagnosticExcerptV1 = {
  startLine: 4,
  before: "Some text.\n\n",
  highlight: { start: "\\:::", omittedChars: 0, omittedLines: 0, end: "" },
  after: "\n\nMore text.",
  clippedStart: false,
  clippedEnd: false,
};

/** Each line of the snippet, with the line number it shows. */
function numberedLines({ text, lineNumber }: Snippet): string[] {
  return text.split("\n").map((line, i) => `${lineNumber(i + 1)}: ${line}`);
}

function problem({ text, from, to }: Snippet): string {
  return text.slice(from, to);
}

describe("buildSnippet", () => {
  it("shows the excerpt with its lines numbered from where it was imported", () => {
    const snippet = buildSnippet(excerpt, null, []);

    expect(numberedLines(snippet)).toEqual([
      "4: Some text.",
      "5: ",
      "6: \\:::",
      "7: ",
      "8: More text.",
    ]);
    expect(problem(snippet)).toBe("\\:::");
  });

  it("numbers the lines from where the problem is now", () => {
    const range = { startLine: 10, startColumn: 1, endLine: 10, endColumn: 5 };
    const snippet = buildSnippet(excerpt, range, []);

    expect(snippet.lineNumber(1)).toBe(8);
    expect(snippet.lineNumber(3)).toBe(10);
  });

  it("marks where text was cut from either end", () => {
    const clipped = { ...excerpt, clippedStart: true, clippedEnd: true };
    const snippet = buildSnippet(clipped, null, []);

    expect(snippet.text).toBe("…Some text.\n\n\\:::\n\nMore text.…");
    expect(problem(snippet)).toBe("\\:::");
  });

  it("shows a long problem's halves, keeping the line numbers past the cut", () => {
    const long: DiagnosticExcerptV1 = {
      startLine: 1,
      before: "Intro\n\n",
      highlight: {
        start: ":::figure\nfirst half",
        omittedChars: 500,
        omittedLines: 20,
        end: "second half\n:::",
      },
      after: "\n\nOutro",
      clippedStart: false,
      clippedEnd: false,
    };
    const snippet = buildSnippet(long, null, []);

    expect(problem(snippet)).toBe(":::figure\nfirst half…second half\n:::");
    expect(numberedLines(snippet)).toEqual([
      "1: Intro",
      "2: ",
      "3: :::figure",
      "4: first half…second half",
      "25: :::",
      "26: ",
      "27: Outro",
    ]);
  });

  it("shows uploaded media refs as their URLs, like the body does", () => {
    const ref = "raven-media://media-1";
    const url = "https://bucket.s3.amazonaws.com/a.png";
    const uploads: ImportUpload[] = [
      { id: "u1", ref, status: "completed", url, error: null },
      {
        id: "u2",
        ref: "raven-media://media-2",
        status: "failed",
        url: null,
        error: null,
      },
    ];
    const withMedia: DiagnosticExcerptV1 = {
      ...excerpt,
      before: `:::image{src="${ref}"}\n:::\n\n`,
      highlight: {
        ...excerpt.highlight,
        start: ':::image{src="raven-media://media-2"}',
      },
    };
    const snippet = buildSnippet(withMedia, null, uploads);

    expect(snippet.text).toContain(`:::image{src="${url}"}`);
    expect(problem(snippet)).toBe(':::image{src="raven-media://media-2"}');
  });
});
