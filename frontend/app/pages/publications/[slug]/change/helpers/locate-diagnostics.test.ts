import { ImportUpload } from "@/apiv1/imports";
import {
  DiagnosticExcerptV1,
  ImportDiagnosticV1,
  SourceRangeV1,
} from "@/types/v1";
import { describe, expect, it } from "vitest";
import loremImport from "./__fixtures__/lorem-import.md?raw";
import { createDiagnosticLocator } from "./locate-diagnostics";

const S3 = "https://bucket.s3.amazonaws.com";

function upload(n: number, url: string | null = null): ImportUpload {
  return {
    id: `u${n}`,
    ref: `raven-media://media-${n}`,
    status: url ? "completed" : "pending",
    url,
    error: null,
  };
}

function diagnostic(
  range: SourceRangeV1,
  excerpt?: DiagnosticExcerptV1
): ImportDiagnosticV1 {
  return {
    code: "test",
    severity: "warning",
    message: "Test",
    path: ["body"],
    range,
    excerpt,
  };
}

function onLine(line: number, column: number, length: number): SourceRangeV1 {
  return {
    startLine: line,
    startColumn: column,
    endLine: line,
    endColumn: column + length,
  };
}

const UNCUT = { omittedChars: 0, omittedLines: 0, end: "" };

// A stray `\:::` on line 5, with the excerpt Raven stores for it.
const body = [
  "# Intro",
  "",
  "Some text.",
  "",
  "\\:::",
  "",
  "More text.",
  "",
  "The end.",
].join("\n");
const strayClose = diagnostic(onLine(5, 1, 4), {
  startLine: 2,
  before: "\nSome text.\n\n",
  highlight: { start: "\\:::", ...UNCUT },
  after: "\n\nMore text.\n",
  clippedStart: false,
  clippedEnd: false,
});

describe("createDiagnosticLocator", () => {
  it("finds an unedited problem where it was", () => {
    const locate = createDiagnosticLocator(body, []);
    expect(locate(strayClose)).toEqual(strayClose.range);
  });

  it("follows the problem when the text before it changes", () => {
    const locate = createDiagnosticLocator(`New paragraph.\n\n${body}`, []);
    expect(locate(strayClose)).toEqual(onLine(7, 1, 4));
  });

  it.each([
    ["the problem is fixed", body.replace("\\:::", "")],
    ["the text around it is edited", body.replace("Some", "Other")],
  ])("returns null once %s", (_, edited) => {
    expect(createDiagnosticLocator(edited, [])(strayClose)).toBeNull();
  });

  it("returns null without an excerpt", () => {
    const locate = createDiagnosticLocator(body, []);
    expect(locate(diagnostic(onLine(5, 1, 4)))).toBeNull();
  });

  it("only looks at the first 20 copies of the problem's start", () => {
    // Copies of the text up to the problem; only the last one goes on to
    // "More text.", as the excerpt does.
    const copies = (n: number) =>
      "\nSome text.\n\n\\:::\n".repeat(n - 1) +
      "\nSome text.\n\n\\:::\n\nMore text.\n";

    expect(createDiagnosticLocator(copies(20), [])(strayClose)).not.toBeNull();
    expect(createDiagnosticLocator(copies(21), [])(strayClose)).toBeNull();
  });

  it("picks the copy nearest where the problem was", () => {
    const locate = createDiagnosticLocator(`${body}\n${body}`, []);
    const inSecondCopy = { ...strayClose, range: onLine(14, 1, 4) };

    expect(locate(strayClose)).toEqual(onLine(5, 1, 4));
    expect(locate(inSecondCopy)).toEqual(onLine(14, 1, 4));
  });
});

describe("createDiagnosticLocator with media", () => {
  const ref = "raven-media://media-1";
  const url = `${S3}/a.png`;
  const image = `:::image{src="${ref}"}`;
  const figure = [":::figure{#fig-1}", image, ":::", ":::"].join("\n");
  const misplacedImage = diagnostic(onLine(2, 1, image.length), {
    startLine: 1,
    before: ":::figure{#fig-1}\n",
    highlight: { start: image, ...UNCUT },
    after: "\n:::\n:::",
    clippedStart: false,
    clippedEnd: false,
  });

  it.each([
    ["before its upload finishes", figure, [upload(1)]],
    ["once the body has its URL", figure.replace(ref, url), [upload(1, url)]],
    ["before the body has its URL", figure, [upload(1, url)]],
  ])("finds a problem with a media ref %s", (_, text, uploads) => {
    const length = text.split("\n")[1].length;
    expect(createDiagnosticLocator(text, uploads)(misplacedImage)).toEqual(
      onLine(2, 1, length)
    );
  });

  it("finds a problem that starts with an uploaded ref", () => {
    const atTop = diagnostic(onLine(1, 1, ref.length), {
      startLine: 1,
      before: "",
      highlight: { start: ref, ...UNCUT },
      after: "\nCaption",
      clippedStart: false,
      clippedEnd: false,
    });
    const locate = createDiagnosticLocator(`${url}\nCaption`, [upload(1, url)]);
    expect(locate(atTop)).toEqual(onLine(1, 1, url.length));
  });

  // 120 characters on each side of a ref: long enough that the ref is in the
  // omitted middle.
  const problem = `${"a".repeat(120)} ${ref} ${"b".repeat(120)}`;
  const longProblem = diagnostic(onLine(3, 1, problem.length), {
    startLine: 1,
    before: "Intro\n\n",
    highlight: {
      start: problem.slice(0, 100),
      omittedChars: problem.length - 200,
      omittedLines: 0,
      end: problem.slice(-100),
    },
    after: "\n\nOutro",
    clippedStart: false,
    clippedEnd: false,
  });
  const withProblem = (text: string) => `Intro\n\n${text}\n\nOutro`;

  it("finds a long problem by its two halves", () => {
    const uploaded = problem.replace(ref, url);
    const locate = createDiagnosticLocator(withProblem(uploaded), [
      upload(1, url),
    ]);
    expect(locate(longProblem)).toEqual(onLine(3, 1, uploaded.length));
  });

  it("returns null when the middle of a long problem changes length", () => {
    const edited = problem.replace(ref, `${ref} and more`);
    const locate = createDiagnosticLocator(withProblem(edited), []);
    expect(locate(longProblem)).toBeNull();
  });
});

describe("createDiagnosticLocator on an imported doc", () => {
  it("finds a moved heading image after uploads and edits", () => {
    const uploads = [1, 2, 3, 4, 5, 6, 7].map((n) =>
      upload(n, `${S3}/${n}.png`)
    );
    const uploaded = uploads.reduce(
      (text, { ref, url }) => text.replace(ref, url!),
      loremImport
    );
    const movedImage = diagnostic(
      { startLine: 313, startColumn: 1, endLine: 318, endColumn: 7 },
      {
        startLine: 310,
        before: "\n::::::\n\n",
        highlight: {
          start: [
            '::::::figure{type="img"}',
            "",
            ':::::image{src="raven-media://media-5"}',
            ":::::",
            "",
            "::::::",
          ].join("\n"),
          ...UNCUT,
        },
        after:
          '\n\n::::::figure{#mean-subst align="Set figure alignment: center, left, or right" type="image" label="Figure 5"}\n',
        clippedStart: false,
        clippedEnd: false,
      }
    );

    const locate = createDiagnosticLocator(
      `A new opening paragraph.\n\n${uploaded}`,
      uploads
    );
    expect(locate(movedImage)).toEqual({
      startLine: 315,
      startColumn: 1,
      endLine: 320,
      endColumn: 7,
    });
  });
});
