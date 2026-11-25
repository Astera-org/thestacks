import { ImportStatusResponse, ImportUpload } from "@/apiv1/imports";
import { ImportDiagnosticV1, PublicationV1 } from "@/types/v1";
import { forEachDiagnostic } from "@codemirror/lint";
import { queryResult } from "@test/queryResult";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { EditorView } from "@uiw/react-codemirror";
import { describe, expect, it, vi } from "vitest";
import { extractFigures } from "../helpers/extract-figures";
import ImportIssuesSection from "./ImportIssuesSection";

const IMPORTED = [
  "# Intro",
  "",
  "\\:::",
  "",
  ':::image{src="TBD"}',
  ":::",
  "",
  ':::image{src="TBD"}',
  ":::",
].join("\n");

const STRAY = "A `:::` without an opening directive was kept as text.";
const NOT_A_LINK = "This image's source isn't a full URL.";

/**
 * A diagnostic on one line of `IMPORTED`, with the excerpt Raven stores for
 * it: up to three whole lines on each side.
 */
function diagnosticAt(
  severity: ImportDiagnosticV1["severity"],
  message: string,
  line: number,
  column: number,
  length: number
): ImportDiagnosticV1 {
  const lines = IMPORTED.split("\n");
  const text = lines[line - 1];
  const from = column - 1;
  return {
    code: "test",
    severity,
    message,
    path: ["body"],
    range: {
      startLine: line,
      startColumn: column,
      endLine: line,
      endColumn: column + length,
    },
    excerpt: {
      startLine: Math.max(1, line - 3),
      before: [
        ...lines.slice(Math.max(0, line - 4), line - 1),
        text.slice(0, from),
      ].join("\n"),
      highlight: {
        start: text.slice(from, from + length),
        omittedChars: 0,
        omittedLines: 0,
        end: "",
      },
      after: [text.slice(from + length), ...lines.slice(line, line + 3)].join(
        "\n"
      ),
      clippedStart: false,
      clippedEnd: false,
    },
  };
}

const strayClose = diagnosticAt("error", STRAY, 3, 1, 4);
const firstTbd = diagnosticAt("warning", NOT_A_LINK, 5, 15, 3);
const secondTbd = diagnosticAt("warning", NOT_A_LINK, 8, 15, 3);

const SETTLED: ImportStatusResponse = {
  publicationId: "p1",
  versionId: "v1",
  settled: true,
  uploads: [],
};

function renderSection({
  body = IMPORTED,
  collapsed = false,
  diagnostics = [secondTbd, strayClose, firstTbd],
  isReadOnly = false,
  uploadState = SETTLED,
  uploadsLoading = false,
  onShowFigure = vi.fn(),
  onShowInEditor = vi.fn(),
}: {
  body?: string;
  collapsed?: boolean;
  diagnostics?: ImportDiagnosticV1[] | null;
  isReadOnly?: boolean;
  uploadState?: ImportStatusResponse;
  uploadsLoading?: boolean;
  onShowFigure?: () => void;
  onShowInEditor?: () => void;
} = {}) {
  const importDocument = { id: "i1", url: "", format: "gdoc", diagnostics };
  return render(
    <ImportIssuesSection
      collapsed={collapsed}
      figures={extractFigures(body)}
      importStatusResponse={queryResult(uploadState, {
        isLoading: uploadsLoading,
      })}
      isReadOnly={isReadOnly}
      publication={{ id: "p1", body, importDocument } as PublicationV1}
      status={{ status: "saved", lastUpdated: null }}
      onShowFigure={onShowFigure}
      onShowInEditor={onShowInEditor}
      onToggleCollapse={vi.fn()}
    />
  );
}

/** Each issue's message and where it is, in one list. */
function issues(name: "Import errors" | "Import warnings") {
  return within(screen.getByRole("list", { name }))
    .getAllByRole("listitem")
    .filter((item) => item.querySelector("ul"))
    .map((item) => ({
      message: item.querySelector("p")?.textContent,
      places: within(item.querySelector("ul")!)
        .getAllByRole("listitem")
        .map(
          (place) =>
            (
              place.querySelector("[aria-expanded]") ??
              place.querySelector("span")
            )?.textContent
        ),
    }));
}

/** The pills in the section's header. */
function countPills() {
  const group = screen.getByRole("group", { name: "Issue counts" });
  return Array.from(group.children, (pill) => pill.textContent);
}

describe("ImportIssuesSection", () => {
  it.each([null, []])("isn't shown with diagnostics %j", (diagnostics) => {
    const { container } = renderSection({ diagnostics });
    expect(container.innerHTML).toBe("");
  });

  it("lists errors, then warnings, each message once with its places", () => {
    renderSection();

    expect(issues("Import errors")).toEqual([
      { message: STRAY, places: ["Body, line 3"] },
    ]);
    expect(issues("Import warnings")).toEqual([
      { message: NOT_A_LINK, places: ["Body, line 5", "Body, line 8"] },
    ]);
    expect(screen.getByText("2 places")).toBeTruthy();
    expect(countPills()).toEqual(["1 Error", "2 Warnings"]);
  });

  it("shows where a problem is now, and opens the editor there", () => {
    const onShowInEditor = vi.fn();
    renderSection({ body: `New paragraph.\n\n${IMPORTED}`, onShowInEditor });

    fireEvent.click(
      screen.getByRole("button", { name: "Show in editor: Body, line 5" })
    );

    expect(onShowInEditor).toHaveBeenCalledWith({
      startLine: 5,
      startColumn: 1,
      endLine: 5,
      endColumn: 5,
    });
    const button = screen.getByRole("button", {
      name: "Show in editor: Body, line 5",
    });
    const describedBy = button.getAttribute("aria-describedby") ?? "";
    expect(document.getElementById(describedBy)?.textContent).toBe(STRAY);
  });

  it("says when a problem's text has changed, with no editor link", () => {
    renderSection({ body: IMPORTED.replace("\\:::", "Fixed.") });

    expect(issues("Import errors")).toEqual([
      { message: STRAY, places: ["Body, changed since import"] },
    ]);
    expect(screen.queryByRole("button", { name: /Body, line 3/ })).toBeNull();
  });

  it("names just the field for problems it can't look for", () => {
    const missingTitle: ImportDiagnosticV1 = {
      code: "missing-title",
      severity: "warning",
      message: "No title.",
      path: ["title"],
    };
    const withoutExcerpt = { ...strayClose, excerpt: undefined };
    renderSection({ diagnostics: [withoutExcerpt, missingTitle] });

    expect(issues("Import errors")).toEqual([
      { message: STRAY, places: ["Body"] },
    ]);
    expect(issues("Import warnings")).toEqual([
      { message: "No title.", places: ["Title"] },
    ]);
    expect(
      screen.queryByRole("button", { name: /^Show in editor/ })
    ).toBeNull();
  });

  it("finds problems whose media refs are now upload URLs", () => {
    const url = "https://bucket.s3.amazonaws.com/a.png";
    const upload: ImportUpload = {
      id: "u1",
      ref: "raven-media://media-1",
      status: "completed",
      url,
      error: null,
    };
    const movedImage: ImportDiagnosticV1 = {
      ...firstTbd,
      message: "This image was moved out of a heading.",
      excerpt: {
        ...firstTbd.excerpt!,
        before: "",
        highlight: {
          ...firstTbd.excerpt!.highlight,
          start: `:::image{src="${upload.ref}"}`,
        },
        after: "\n:::",
      },
    };
    const body = `:::image{src="${url}"}\n:::`;

    // Not "changed" while the uploads that would match it are loading.
    const { unmount } = renderSection({
      body,
      diagnostics: [movedImage],
      uploadState: undefined,
      uploadsLoading: true,
    });
    expect(issues("Import warnings")[0]?.places).toEqual(["Body"]);
    unmount();

    renderSection({
      body,
      diagnostics: [movedImage],
      uploadState: { ...SETTLED, uploads: [upload] },
    });
    expect(issues("Import warnings")[0]?.places).toEqual(["Body, line 1"]);
  });

  it("keeps errors visible when collapsed", () => {
    renderSection({ collapsed: true });

    expect(screen.getByRole("list", { name: "Import errors" })).toBeTruthy();
    expect(screen.queryByRole("list", { name: "Import warnings" })).toBeNull();
  });

  it("has nothing to collapse without warnings", () => {
    renderSection({ diagnostics: [strayClose] });

    expect(
      screen.queryByRole("button", { name: /collapse|expand/i })
    ).toBeNull();
  });

  it("doesn't open the editor while the body can't be edited", () => {
    renderSection({ isReadOnly: true });

    expect(
      screen.getByRole<HTMLButtonElement>("button", {
        name: "Show in editor: Body, line 3",
      }).disabled
    ).toBe(true);
  });

  it("opens a place to show the imported text, numbered where it is now", async () => {
    renderSection({ body: `New paragraph.\n\n${IMPORTED}` });

    const toggle = screen.getByRole("button", { name: "Body, line 5" });
    fireEvent.click(toggle);

    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    const snippet = screen.getByRole("group", {
      name: "Imported text at Body, line 5",
    });
    expect(toggle.getAttribute("aria-controls")).toBe(snippet.id);
    const editor = snippet.querySelector<HTMLElement>(".cm-editor")!;
    const view = EditorView.findFromDOM(editor)!;
    expect(view.state.doc.toString()).toBe(
      IMPORTED.split("\n").slice(0, 6).join("\n")
    );
    const numbers = Array.from(
      editor.querySelectorAll(".cm-lineNumbers .cm-gutterElement"),
      (number) => number.textContent
    ).filter(Boolean);
    expect(numbers.slice(-6)).toEqual(["3", "4", "5", "6", "7", "8"]);
    await waitFor(() => {
      const marked: string[] = [];
      forEachDiagnostic(view.state, (_, from, to) =>
        marked.push(view.state.sliceDoc(from, to))
      );
      expect(marked).toEqual(["\\:::"]);
      // With its marker in the gutter, as in the full editor.
      expect(editor.querySelector(".cm-lint-marker-error")).not.toBeNull();
    });
  });

  it("closes a place again", () => {
    renderSection();

    const toggle = screen.getByRole("button", { name: "Body, line 3" });
    fireEvent.click(toggle);
    fireEvent.click(toggle);

    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByRole("group", { name: /^Imported text/ })).toBeNull();
  });

  it("has nothing to open without an excerpt", () => {
    renderSection({ diagnostics: [{ ...strayClose, excerpt: undefined }] });

    expect(screen.queryByRole("button", { expanded: false })).toBeNull();
  });

  it("links an issue inside a figure to the figure's row", () => {
    const onShowFigure = vi.fn();
    renderSection({ body: `New paragraph.\n\n${IMPORTED}`, onShowFigure });

    const link = screen.getByRole("link", {
      name: "Show figure: Body, line 7",
    });
    expect(link.getAttribute("href")).toBe("#figure-7-1");
    fireEvent.click(link);
    expect(onShowFigure).toHaveBeenCalled();
    expect(screen.getAllByRole("link", { name: /^Show figure/ })).toHaveLength(
      2
    );
  });

  it("names the linked figure by its label", () => {
    const body = [
      '::::figure{label="Figure 1"}',
      ':::image{src="TBD"}',
      ":::",
      "::::",
    ].join("\n");
    const inFigure: ImportDiagnosticV1 = {
      ...firstTbd,
      range: { startLine: 2, startColumn: 15, endLine: 2, endColumn: 18 },
      excerpt: {
        ...firstTbd.excerpt!,
        startLine: 1,
        before: '::::figure{label="Figure 1"}\n:::image{src="',
        after: '"}\n:::\n::::',
      },
    };
    renderSection({ body, diagnostics: [inFigure] });

    expect(
      screen.getByRole("link", { name: "Show figure: Figure 1" })
    ).toBeTruthy();
  });

  it("doesn't link issues outside figures, or ones it can't find", () => {
    // Editing the line above the first image changes its excerpt's context.
    renderSection({ body: IMPORTED.replace("\\:::", "Fixed.") });

    expect(
      screen
        .getAllByRole("link", { name: /^Show figure/ })
        .map((link) => link.getAttribute("href"))
    ).toEqual(["#figure-8-1"]);
  });
});
