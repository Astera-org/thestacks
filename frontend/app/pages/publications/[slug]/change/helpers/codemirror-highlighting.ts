import { ImportDiagnosticV1, SourceRangeV1 } from "@/types/v1";
import { setDiagnostics } from "@codemirror/lint";
import type { Text } from "@codemirror/state";
import { EditorView } from "@uiw/react-codemirror";

export function showErrors(view: EditorView, messages: ImportDiagnosticV1[]) {
  const doc = view.state.doc;
  const diagnostics = messages
    .filter((m) => m.range)
    .map((m) => ({
      from: toOffset(doc, m.range!.startLine, m.range!.startColumn),
      to: toOffset(doc, m.range!.endLine, m.range!.endColumn),
      severity: m.severity,
      message: m.message,
    }));
  view.dispatch(setDiagnostics(view.state, diagnostics));
}

/** Selects `range` and scrolls it to the middle of the editor. */
export function selectRange(view: EditorView, range: SourceRangeV1) {
  const { doc } = view.state;
  const from = toOffset(doc, range.startLine, range.startColumn);
  const to = toOffset(doc, range.endLine, range.endColumn);
  view.dispatch({
    selection: { anchor: from, head: to },
    effects: EditorView.scrollIntoView(from, { y: "center" }),
  });
}

export function toOffset(doc: Text, line: number, ch: number): number {
  const l = doc.line(Math.min(Math.max(line, 1), doc.lines));
  return Math.min(l.from + ch - 1, l.to); // clamp so bad positions don't throw
}
