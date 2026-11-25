import { ImportUpload } from "@/apiv1/imports";
import {
  DiagnosticExcerptV1,
  ImportDiagnosticV1,
  SourceRangeV1,
} from "@/types/v1";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { linter, lintGutter } from "@codemirror/lint";
import CodeMirror, {
  BasicSetupOptions,
  EditorView,
  lineNumbers,
} from "@uiw/react-codemirror";
import { useMemo } from "react";
import { buildSnippet } from "../helpers/diagnostic-snippet";

// Line numbers come from the excerpt instead, and nothing here is edited.
const SETUP: BasicSetupOptions = {
  lineNumbers: false,
  foldGutter: false,
  highlightActiveLine: false,
  highlightActiveLineGutter: false,
};

/**
 * A read-only view of the text around a diagnostic, as it was imported, with
 * the problem marked as it is in the full editor.
 */
export default function DiagnosticSnippet({
  diagnostic: { message, severity },
  excerpt,
  id,
  label,
  range,
  uploads,
}: {
  diagnostic: ImportDiagnosticV1;
  excerpt: DiagnosticExcerptV1;
  id: string;
  /** Where the problem is, e.g. "Body, line 74", to name the snippet by. */
  label: string;
  /** Where the problem is in the body now, if it can be found. */
  range: SourceRangeV1 | null;
  uploads: readonly ImportUpload[];
}) {
  const snippet = useMemo(
    () => buildSnippet(excerpt, range, uploads),
    [excerpt, range, uploads]
  );
  const extensions = useMemo(() => {
    const { from, to, lineNumber } = snippet;
    return [
      markdown({ base: markdownLanguage }),
      EditorView.lineWrapping,
      lineNumbers({ formatNumber: (line) => String(lineNumber(line)) }),
      // A linter rather than a one-off mark, so the mark survives the
      // editor being reconfigured.
      linter(() => [{ from, to, severity, message }], { delay: 0 }),
      lintGutter(),
    ];
  }, [snippet, severity, message]);

  return (
    <div
      aria-label={`Imported text at ${label}`}
      className="border-border text-caption-30 overflow-hidden rounded-lg border"
      id={id}
      role="group"
    >
      <CodeMirror
        basicSetup={SETUP}
        editable={false}
        extensions={extensions}
        readOnly
        theme="light"
        value={snippet.text}
      />
    </div>
  );
}
