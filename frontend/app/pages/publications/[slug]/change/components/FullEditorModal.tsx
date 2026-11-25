import { ImportUpload } from "@/apiv1/imports";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import MystRenderer from "@/components/MystRenderer";
import Button from "@/components/stacks-ui/Button";
import { Overlay } from "@/components/stacks-ui/Dialog";
import { EditPublicationStatus } from "@/hooks/use-edit-publication/types";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { markdownToTextSync } from "@/lib/markdown";
import { cn } from "@/lib/utils";
import { ImportDiagnosticV1, SourceRangeV1 } from "@/types/v1";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { languages } from "@codemirror/language-data";
import { linter, lintGutter } from "@codemirror/lint";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useDebounce } from "@uidotdev/usehooks";
import CodeMirror, {
  EditorView,
  Extension,
  ReactCodeMirrorProps,
  scrollPastEnd,
} from "@uiw/react-codemirror";
import { Columns2, Eye, File, PenLine } from "lucide-react";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { selectRange, showErrors } from "../helpers/codemirror-highlighting";
import { createDiagnosticLocator } from "../helpers/locate-diagnostics";
import { PublicationStatusPill } from "./PublicationStatusPill";

/** Whether the full editor is open, and what to select when it opens. */
export type FullEditorState =
  { open: false } | { open: true; focusRange: SourceRangeV1 | null };

export function FullEditorModal({
  closeModal,
  content,
  fileName,
  focusRange,
  importDiagnostics,
  open,
  onChange,
  onOpenChange,
  status,
  title,
  uploads,
  windowLabel,
}: {
  closeModal: () => void;
  content: string;
  fileName: string;
  /** Selected and scrolled to when the editor opens. */
  focusRange: SourceRangeV1 | null;
  importDiagnostics: ImportDiagnosticV1[] | undefined;
  open: boolean;
  onChange: (text: string) => void;
  onOpenChange: (open: boolean) => void;
  status: EditPublicationStatus;
  title: string;
  /** The import's media uploads, to find diagnostics whose refs became URLs. */
  uploads: readonly ImportUpload[] | undefined;
  windowLabel: string;
}) {
  const isMedium = useBreakpoint("md");
  const [tab, setTab] = useState<TabType>("editing");

  // Opening at a range shows the editor, which the preview tab doesn't.
  const openedAt = open ? focusRange : null;
  const [lastOpenedAt, setLastOpenedAt] = useState(openedAt);
  if (openedAt !== lastOpenedAt) {
    setLastOpenedAt(openedAt);
    if (openedAt && tab === "preview") setTab("editing");
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <Overlay>
          <DialogPrimitive.Content
            aria-describedby={undefined}
            className={cn(
              "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 bg-surface z-[250] flex w-full flex-col gap-4 overflow-hidden rounded-2xl border shadow-lg duration-200 md:rounded-lg",
              tab === "split" && isMedium ? "max-w-[1440px]" : "max-w-5xl"
            )}
            style={{
              width: "min(1440px,96vw)",
              height: "min(1440px,92vh)",
              boxShadow: "0 30px 80px rgba(33,38,48,0.3)",
            }}
            onOpenAutoFocus={(event) => {
              // The editor takes focus at the range instead.
              if (focusRange) event.preventDefault();
            }}
          >
            <DialogPrimitive.Title className="sr-only">
              {windowLabel}
            </DialogPrimitive.Title>
            <FullEditorContent
              closeModal={closeModal}
              content={content}
              fileName={fileName}
              focusRange={focusRange}
              importDiagnostics={importDiagnostics}
              setTab={setTab}
              status={status}
              tab={tab}
              title={title}
              uploads={uploads}
              windowLabel={windowLabel}
              onChange={onChange}
            />
          </DialogPrimitive.Content>
        </Overlay>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

type TabType = "editing" | "preview" | "split";

export function FullEditorContent({
  closeModal,
  content,
  fileName,
  focusRange,
  importDiagnostics,
  onChange,
  setTab,
  status,
  tab,
  title,
  uploads,
  windowLabel,
}: {
  closeModal: () => void;
  content: string;
  fileName: string;
  focusRange: SourceRangeV1 | null;
  importDiagnostics: ImportDiagnosticV1[] | undefined;
  onChange: (text: string) => void;
  setTab: (value: TabType) => void;
  status: EditPublicationStatus;
  tab: TabType;
  title: string;
  uploads: readonly ImportUpload[] | undefined;
  windowLabel: string;
}) {
  const isMedium = useBreakpoint("md");
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const handleEditorChange: ReactCodeMirrorProps["onChange"] = (newVal) => {
    onChange(newVal);
  };

  const [view, setView] = useState<EditorView | null>(null);
  const extensions: Extension[] = useMemo(
    () => [
      EditorView.lineWrapping,
      scrollPastEnd(),
      markdown({
        base: markdownLanguage,
        codeLanguages: languages,
      }),
      linter(null),
      lintGutter(),
    ],
    []
  );

  // Each new editor marks the problems where they are in the text it opens
  // with. After that, CodeMirror moves the marks along with each edit, which
  // follows them better than finding their excerpts again on each save would.
  const handleCreateEditor = (created: EditorView) => {
    setView(created);
    if (!importDiagnostics?.length) return;
    const locate = createDiagnosticLocator(
      created.state.doc.toString(),
      uploads ?? []
    );
    showErrors(
      created,
      importDiagnostics.flatMap((diagnostic) => {
        const range = locate(diagnostic);
        return range ? [{ ...diagnostic, range }] : [];
      })
    );
  };

  // A new view is created each time the editor opens.
  useEffect(() => {
    if (!view || !focusRange) return;
    selectRange(view, focusRange);
    view.focus();
  }, [view, focusRange]);

  /**
   * The MystRenderer is exceptionally slow, so debounce and defer the value so
   * that it does not affect the performance of the editor in the split viewer.
   */
  const debouncedContent = useDebounce(content, 2000);
  const deferredContent = useDeferredValue(debouncedContent, "");

  const isLoading = content !== deferredContent;
  return (
    <div className="relative flex size-full flex-col overflow-hidden">
      <ModalHeader
        closeModal={closeModal}
        fileName={fileName}
        setTab={setTab}
        status={status}
        tab={tab}
        title={title}
        windowLabel={windowLabel}
      />
      <div className="min-h-0 flex-1 overflow-hidden">
        <div
          ref={scrollRef}
          className="fe-scroll bg-surface-sunken h-full w-full min-w-0 flex-1 overflow-hidden"
        >
          <div
            className={cn(
              "h-full w-full rounded-lg",
              isMedium && tab === "split" ? "grid grid-cols-2" : ""
            )}
          >
            {(tab === "editing" || tab === "split") && (
              <div className="h-full overflow-hidden">
                <CodeMirror
                  className="h-full"
                  extensions={extensions}
                  height="100%"
                  theme="light"
                  value={content}
                  onChange={handleEditorChange}
                  onCreateEditor={handleCreateEditor}
                />
              </div>
            )}
            {(tab === "preview" || (isMedium && tab === "split")) && (
              <div className="relative max-h-full overflow-y-auto">
                <div className="h-full p-2 md:p-10">
                  <article className="prose no-margin-first-child">
                    <MystRenderer myst={deferredContent} />
                  </article>
                </div>
                {isLoading && (
                  <div className="pointer-events-none absolute top-0 left-0 z-200 flex w-full items-center justify-center">
                    <div className="bg-gray-blue-200/70 text-carbon-800 m-3 flex w-fit items-center gap-3 rounded-full px-3 py-2 font-mono shadow-lg backdrop-blur-xs">
                      Loading <LoadingSpinner />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="border-border bg-surface flex flex-none items-center justify-between gap-4 border-t px-2 py-1.5">
        <span className="text-caption-20 text-fg-muted ml-2 font-mono">
          {isMedium
            ? "Edits stay in The Stacks and won't sync back to Google Docs."
            : "Edits won't sync to Google Docs."}
        </span>
        <div className="flex items-center gap-3">
          <Button className="whitespace-nowrap" size="sm" onClick={closeModal}>
            Done{isMedium && " editing"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function ModalHeader({
  closeModal,
  fileName,
  setTab,
  status,
  tab,
  title,
  windowLabel,
}: {
  closeModal: () => void;
  fileName: string;
  setTab: (value: TabType) => void;
  status: EditPublicationStatus;
  tab: TabType;
  title: string;
  windowLabel: string;
}) {
  const isMedium = useBreakpoint("md");
  const isEditing = tab === "editing" || (!isMedium && tab === "split");
  const tabs = (
    <div className="flex flex-row gap-2">
      <Button
        className={cn(
          "inline-flex items-center gap-1.5 px-3.5",
          isEditing ? "cursor-default" : ""
        )}
        intent={isEditing ? "primary" : "secondary"}
        size="sm"
        onClick={() => setTab("editing")}
      >
        <PenLine size={13} />
        Edit
      </Button>
      {isMedium && (
        <Button
          className={cn(
            "inline-flex items-center gap-1.5 px-3.5",
            tab === "split" ? "cursor-default" : ""
          )}
          intent={tab === "split" ? "primary" : "secondary"}
          size="sm"
          onClick={() => setTab("split")}
        >
          <Columns2 size={13} />
          Split
        </Button>
      )}
      <Button
        className={cn(
          "inline-flex items-center gap-1.5 px-3.5",
          tab === "preview" ? "cursor-default" : ""
        )}
        intent={tab === "preview" ? "primary" : "secondary"}
        size="sm"
        onClick={() => setTab("preview")}
      >
        <Eye size={13} />
        Preview
      </Button>
    </div>
  );

  const windowTitle = (
    <span className="text-caption-20 text-fg-muted font-mono uppercase">
      {windowLabel}
    </span>
  );

  const documentTitle = (
    <div className="flex items-center gap-2.5">
      <span className="text-carbon-800 text-headline-10 truncate overflow-hidden font-serif leading-none whitespace-nowrap">
        {markdownToTextSync(title)}
      </span>
    </div>
  );

  const documentFilename = (
    <span className="text-caption-20 text-fg inline-flex w-fit min-w-0 items-center gap-1.5 overflow-hidden rounded-full bg-gray-200 px-2.5 py-1 font-mono">
      <File className="shrink-0" size={11} />
      <span className="truncate">{fileName}</span>
    </span>
  );

  const closeButton = (
    <div className="flex flex-none items-center gap-3.5">
      <PublicationStatusPill
        className="text-gray-blue-900/60 font-mono"
        status={status}
        transparent
      />
      <button
        aria-label="Close"
        className="border-gray-blue-900/12 text-fg-muted flex size-8 cursor-pointer items-center justify-center rounded-lg border bg-transparent hover:bg-gray-200"
        onClick={closeModal}
      >
        <svg
          fill="none"
          height={15}
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth={2}
          viewBox="0 0 24 24"
          width={15}
        >
          <line x1={18} x2={6} y1={6} y2={18} />
          <line x1={6} x2={18} y1={6} y2={18} />
        </svg>
      </button>
    </div>
  );

  return (
    <div className="border-gray-blue-900/8 flex flex-col gap-2 border-b p-2 pt-2">
      <div className="flex flex-none items-start justify-between gap-6 pt-1 pl-1 md:pl-3">
        {isMedium ? (
          <>
            <div className="flex max-w-1/3 min-w-0 flex-1 items-center gap-4">
              <div className="flex min-w-0 flex-col gap-1">
                <div className="pl-0">{windowTitle}</div>
                <div className="mt-0 pl-0">{documentTitle}</div>
              </div>
            </div>

            <div className="flex max-w-2/3 min-w-0 gap-2">
              <div className="flex max-w-1/2 flex-1 items-center justify-center">
                {documentFilename}
              </div>
              <div className="flex max-w-1/2 flex-1 flex-col items-end gap-1">
                {closeButton}
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="flex max-w-full min-w-0 flex-1 flex-col items-center gap-4">
              <div className="flex w-full min-w-0 flex-row justify-between gap-1">
                <div className="pl-2 md:pl-0">{windowTitle}</div>
                <div className="flex flex-1 flex-col items-end gap-1 md:max-w-1/2">
                  {closeButton}
                </div>
              </div>
              <div className="flex max-w-full flex-1 items-center justify-center">
                {documentFilename}
              </div>
              <div className="mt-0 max-w-full pl-0">{documentTitle}</div>
            </div>
          </>
        )}
      </div>
      <div className="flex h-full min-w-0 flex-1 items-center justify-center">
        {tabs}
      </div>
    </div>
  );
}
