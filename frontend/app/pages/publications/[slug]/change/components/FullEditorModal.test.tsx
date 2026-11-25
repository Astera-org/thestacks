import { ImportUpload } from "@/apiv1/imports";
import { ImportDiagnosticV1, SourceRangeV1 } from "@/types/v1";
import { forEachDiagnostic } from "@codemirror/lint";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { EditorView } from "@uiw/react-codemirror";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { FullEditorModal } from "./FullEditorModal";

// jsdom has no matchMedia, which the editor uses for its breakpoints.
beforeAll(() => {
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
  );
});

const CONTENT = "# Title\n\n:::image{src=a.png}\n:::\n\nAfter.";

const RANGE: SourceRangeV1 = {
  startLine: 3,
  startColumn: 1,
  endLine: 4,
  endColumn: 4,
};

function editor(focusRange: SourceRangeV1 | null, open = true) {
  return (
    <FullEditorModal
      closeModal={vi.fn()}
      content={CONTENT}
      fileName="doc.gdoc"
      focusRange={focusRange}
      importDiagnostics={undefined}
      open={open}
      status={{ status: "saved", lastUpdated: null }}
      title="Title"
      uploads={undefined}
      windowLabel="Full editor · Body"
      onChange={vi.fn()}
      onOpenChange={vi.fn()}
    />
  );
}

function findView(): EditorView {
  const dom = document.querySelector<HTMLElement>(".cm-editor");
  const view = dom && EditorView.findFromDOM(dom);
  if (!view) throw new Error("No editor");
  return view;
}

describe("FullEditorModal", () => {
  it("selects and focuses the focus range when it opens", async () => {
    render(editor(RANGE));

    await waitFor(() => {
      const view = findView();
      const { from, to } = view.state.selection.main;
      expect(view.state.sliceDoc(from, to)).toBe(":::image{src=a.png}\n:::");
      expect(view.hasFocus).toBe(true);
    });
  });

  it("leaves the cursor at the start without a focus range", async () => {
    render(editor(null));

    await waitFor(() => findView());
    expect(findView().state.selection.main).toMatchObject({ from: 0, to: 0 });
  });

  it("switches from the preview to the editor to show the range", async () => {
    const { rerender } = render(editor(null));
    fireEvent.click(screen.getByRole("button", { name: /Preview/ }));
    expect(document.querySelector(".cm-editor")).toBeNull();

    rerender(editor(null, false));
    rerender(editor(RANGE));

    await waitFor(() => {
      const { from, to } = findView().state.selection.main;
      expect([from, to]).toEqual([
        CONTENT.indexOf(":::"),
        CONTENT.indexOf("\n\nAfter"),
      ]);
    });
  });
});

// A stray `\:::` as imported, with the excerpt Raven stores for it.
const IMPORTED = "# Title\n\n\\:::\n\nAfter.";
const strayClose: ImportDiagnosticV1 = {
  code: "unmatched-directive-close",
  severity: "error",
  message: "Stray directive close",
  path: ["body"],
  range: { startLine: 3, startColumn: 1, endLine: 3, endColumn: 5 },
  excerpt: {
    startLine: 1,
    before: "# Title\n\n",
    highlight: { start: "\\:::", omittedChars: 0, omittedLines: 0, end: "" },
    after: "\n\nAfter.",
    clippedStart: false,
    clippedEnd: false,
  },
};

function editorWith(
  content: string,
  importDiagnostics: ImportDiagnosticV1[],
  uploads: ImportUpload[] = []
) {
  return (
    <FullEditorModal
      closeModal={vi.fn()}
      content={content}
      fileName="doc.gdoc"
      focusRange={null}
      importDiagnostics={importDiagnostics}
      open
      status={{ status: "saved", lastUpdated: null }}
      title="Title"
      uploads={uploads}
      windowLabel="Full editor · Body"
      onChange={vi.fn()}
      onOpenChange={vi.fn()}
    />
  );
}

/** Where each diagnostic marked in the editor starts, and the text it marks. */
function marks(view: EditorView): { from: number; text: string }[] {
  const found: { from: number; text: string }[] = [];
  forEachDiagnostic(view.state, (_, from, to) => {
    found.push({ from, text: view.state.sliceDoc(from, to) });
  });
  return found;
}

describe("FullEditorModal import diagnostics", () => {
  it("marks a problem where it is now, not where it was imported", async () => {
    const content = `Intro.\n\n${IMPORTED}`;
    render(editorWith(content, [strayClose]));

    await waitFor(() =>
      expect(marks(findView())).toEqual([
        { from: content.indexOf("\\:::"), text: "\\:::" },
      ])
    );
  });

  it("marks a problem whose media ref is now its upload's URL", async () => {
    const ref = "raven-media://media-1";
    const url = "https://bucket.s3.amazonaws.com/a.png";
    const image = (src: string) => `:::image{src="${src}"}`;
    const movedImage: ImportDiagnosticV1 = {
      ...strayClose,
      excerpt: {
        ...strayClose.excerpt!,
        highlight: { ...strayClose.excerpt!.highlight, start: image(ref) },
        after: "\n:::\n\nAfter.",
      },
    };
    const upload: ImportUpload = {
      id: "u1",
      ref,
      status: "completed",
      url,
      error: null,
    };
    const content = `# Title\n\n${image(url)}\n:::\n\nAfter.`;
    render(editorWith(content, [movedImage], [upload]));

    await waitFor(() =>
      expect(marks(findView())).toEqual([{ from: 9, text: image(url) }])
    );
  });

  it("leaves out problems it can't find", async () => {
    const fixed = IMPORTED.replace("\\:::", "Fixed.");
    const withoutExcerpt = { ...strayClose, excerpt: undefined };
    render(editorWith(fixed, [strayClose, withoutExcerpt]));

    await waitFor(() => findView());
    expect(marks(findView())).toEqual([]);
  });

  it("keeps marks on their text through edits and saves", async () => {
    const { rerender } = render(editorWith(IMPORTED, [strayClose]));
    await waitFor(() => expect(marks(findView())).toHaveLength(1));

    // A line added above, and the text after the problem edited, which
    // would stop its excerpt from being found again.
    const view = findView();
    view.dispatch({
      changes: [
        { from: 0, insert: "New line.\n" },
        { from: IMPORTED.indexOf("After"), insert: "Then " },
      ],
    });
    // A save brings back the same diagnostics in a new array.
    rerender(editorWith(view.state.doc.toString(), [{ ...strayClose }]));

    expect(marks(view)).toEqual([
      { from: "New line.\n".length + IMPORTED.indexOf("\\:::"), text: "\\:::" },
    ]);
  });
});
