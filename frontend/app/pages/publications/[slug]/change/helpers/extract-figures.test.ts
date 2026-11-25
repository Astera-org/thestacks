import { describe, expect, it } from "vitest";
// Copies of raven2's Google Docs importer snapshots
// (importers/google-docs-markdown/tests/__snapshots__/real-docs/).
import fakeStacksPub from "./__fixtures__/fake-stacks-pub.md?raw";
import loremImport from "./__fixtures__/lorem-import.md?raw";
import {
  extractFigures,
  figureRowId,
  findFigure,
  toSourceRange,
} from "./extract-figures";

const lines = (...body: string[]) => body.join("\n");

function summarize(body: string) {
  return extractFigures(body).map((figure) => ({
    line: figure.position.start.line,
    label: figure.label,
    type: figure.type,
    media: figure.media && [figure.media.kind, figure.media.src],
  }));
}

describe("extractFigures", () => {
  it("reads a figure's id, label, type, caption and media", () => {
    const body = lines(
      "Intro.",
      "",
      '::::figure{#growth type="image" label="Figure 1"}',
      ':::image{src="raven-media://media-1" alt="Growth curves"}',
      ":::",
      "",
      ":::figcaption",
      "**Figure 1.** **Growth by temperature.**",
      "",
      "Legend text.",
      ":::",
      "::::"
    );

    const figures = extractFigures(body);

    expect(figures).toHaveLength(1);
    expect(figures[0]).toMatchObject({
      standalone: false,
      id: "growth",
      label: "Figure 1",
      type: "image",
      caption: "Growth by temperature.",
      media: {
        kind: "image",
        src: "raven-media://media-1",
        alt: "Growth curves",
        filename: null,
        position: { start: { line: 4, column: 1 } },
      },
      position: { start: { line: 3, column: 1, offset: 8 }, end: { line: 12 } },
    });
  });

  it("takes the label from the caption when there's no label attribute", () => {
    const [figure] = extractFigures(
      lines(
        "::::figure",
        ":::video{src=https://example.com/a.mp4}",
        ":::",
        ":::figcaption",
        "Video 2: A timelapse.",
        ":::",
        "::::"
      )
    );

    expect(figure).toMatchObject({
      label: "Video 2",
      type: "video",
      caption: "A timelapse.",
    });
  });

  it("keeps the caption whole when its label isn't the figure's", () => {
    const [figure] = extractFigures(
      lines(
        '::::figure{label="Figure 3"}',
        ":::figcaption",
        "Figure 1. Old numbering.",
        ":::",
        "::::"
      )
    );

    expect(figure).toMatchObject({
      label: "Figure 3",
      caption: "Figure 1. Old numbering.",
    });
  });

  it("treats a figure holding a table as a table", () => {
    const [markdownTable, htmlTable] = extractFigures(
      lines(
        ":::figure",
        "| a | b |",
        "| - | - |",
        "| 1 | 2 |",
        ":::",
        "",
        ":::figure",
        "<table><tr><td>1</td></tr></table>",
        ":::"
      )
    );

    expect(markdownTable).toMatchObject({ type: "table", media: null });
    expect(htmlTable).toMatchObject({ type: "table", media: null });
  });

  it("lists media outside figures as standalone, in document order", () => {
    const body = lines(
      ":::audio{src=https://example.com/a.mp3}",
      ":::",
      "",
      ":::figure",
      ":::",
      "",
      "Text with ![A chart](https://example.com/chart.png) inline."
    );

    expect(
      extractFigures(body).map((f) => [
        f.standalone,
        f.type,
        f.media?.kind ?? null,
      ])
    ).toEqual([
      [true, "audio", "audio"],
      [false, null, null],
      [true, "image", "image"],
    ]);
    expect(extractFigures(body)[2]?.media).toMatchObject({
      src: "https://example.com/chart.png",
      alt: "A chart",
    });
  });

  it("ignores leaf directives, which aren't rendered as media", () => {
    expect(extractFigures("::image{src=https://example.com/a.png}")).toEqual(
      []
    );
  });

  it("reports media without a src", () => {
    const [figure] = extractFigures(lines(":::image", ":::"));

    expect(figure?.media).toMatchObject({ src: null, alt: null });
  });

  it("finds figures inside other directives", () => {
    const body = lines(
      ':::::only{platform="web"}',
      "::::figure",
      ":::iframe{src=https://example.com/embed}",
      ":::",
      "::::",
      ":::::"
    );

    expect(summarize(body)).toEqual([
      {
        line: 2,
        label: null,
        type: "iframe",
        media: ["iframe", "https://example.com/embed"],
      },
    ]);
  });

  it("lists every kind of figure in an imported document", () => {
    expect(summarize(fakeStacksPub)).toEqual([
      { line: 13, label: "Table 1", type: "table", media: null },
      {
        line: 28,
        label: "Figure 1",
        type: "image",
        media: ["image", "raven-media://media-1"],
      },
      {
        line: 76,
        label: "Figure 2",
        type: "iframe",
        media: ["iframe", "raven-media://media-2"],
      },
      {
        line: 103,
        label: "Figure 3",
        type: "image",
        media: ["image", "raven-media://media-3"],
      },
      {
        line: 122,
        label: "Figure 4",
        type: "audio",
        media: ["audio", "raven-media://media-4"],
      },
      {
        line: 137,
        label: "Video 1",
        type: "video",
        media: ["video", "raven-media://media-5"],
      },
      {
        line: 152,
        label: null,
        type: "file",
        media: [
          "file",
          "https://drive.google.com/file/d/1K538DEYFyeyyhIAQ2Vcj-kg86UkNYyqo/view?usp=sharing",
        ],
      },
      {
        line: 163,
        label: null,
        type: "iframe",
        media: ["iframe", "https://successteam.typeform.com/to/AR5B4r6L"],
      },
    ]);
    expect(extractFigures(fakeStacksPub)[6]?.media?.filename).toBe(
      "thermotolerance-supplementary-data.xlsx"
    );
  });

  it("keeps template text left in an imported document's figures", () => {
    const figures = extractFigures(loremImport);
    const unlabelled = figures.filter((f) => !f.label);
    const templateSrcs = figures.filter((f) =>
      f.media?.src?.startsWith("Paste the Google Drive URL")
    );

    expect(figures).toHaveLength(18);
    expect(unlabelled.map((f) => f.type)).toEqual(Array(7).fill("img"));
    expect(unlabelled.every((f) => f.caption === null)).toBe(true);
    expect(templateSrcs.map((f) => f.label)).toEqual([
      "Figure 1",
      "Figure 2",
      "Figure 3",
      "Figure 4",
      "Figure 5",
      "Figure 6",
      "Figure 7",
      "Figure 8",
    ]);
  });
});

describe("toSourceRange", () => {
  it("turns a figure's position into an editor range", () => {
    const [figure] = extractFigures(lines("Intro.", "", ":::figure", ":::"));

    expect(toSourceRange(figure.position)).toEqual({
      startLine: 3,
      startColumn: 1,
      endLine: 4,
      endColumn: 4,
    });
  });
});

describe("findFigure", () => {
  const body = lines(
    "Intro.",
    "",
    '::::figure{label="Figure 1"}',
    ':::image{src="TBD"}',
    ":::",
    "::::",
    "",
    ':::image{src="a.png"}',
    ":::"
  );
  const figures = extractFigures(body);

  it.each([
    ["inside a figure", [4, 15, 4, 18], "Figure 1"],
    ["covering a whole figure", [3, 1, 6, 5], "Figure 1"],
    ["inside standalone media", [8, 15, 8, 20], null],
  ])("finds the figure for a range %s", (_, [sl, sc, el, ec], label) => {
    const range = {
      startLine: sl,
      startColumn: sc,
      endLine: el,
      endColumn: ec,
    };
    const figure = findFigure(figures, range);
    expect(figure).not.toBeNull();
    expect(figure?.label).toBe(label);
  });

  it.each([
    ["outside any figure", [1, 1, 1, 7]],
    ["running past a figure's end", [4, 1, 7, 1]],
  ])("finds nothing for a range %s", (_, [sl, sc, el, ec]) => {
    const range = {
      startLine: sl,
      startColumn: sc,
      endLine: el,
      endColumn: ec,
    };
    expect(findFigure(figures, range)).toBeNull();
  });
});

describe("figureRowId", () => {
  it("names a figure's row by where the figure starts", () => {
    const [, image] = extractFigures(
      lines("::::figure", "::::", "", ":::image{src=a.png}", ":::")
    );
    expect(figureRowId(image)).toBe("figure-4-1");
  });
});
