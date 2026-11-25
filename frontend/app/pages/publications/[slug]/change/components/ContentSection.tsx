import { namespaceIssueMessage, ValidationIssue } from "@/api/errors";
import { ImportStatusResponse } from "@/apiv1/imports";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import MystRenderer from "@/components/MystRenderer";
import Button from "@/components/stacks-ui/Button";
import {
  Commit,
  EditPublicationStatus,
} from "@/hooks/use-edit-publication/types";
import { useMdWordCount } from "@/hooks/useMdWordCount";
import { cn } from "@/lib/utils";
import {
  getSubtitleTextLength,
  SUBTITLE_MAX_LEN,
  SUBTITLE_TEXT_MAX_LEN,
  SUBTITLE_TEXT_TOO_LONG_MESSAGE,
} from "@/lib/validators/publications/publish";
import { ImportedFieldV1, PublicationV1 } from "@/types/v1";
import { UseQueryResult } from "@tanstack/react-query";
import { Eye, FileText, Loader } from "lucide-react";
import { Fragment, useId, useMemo } from "react";
import { linkedGoogleDoc } from "../linked-google-doc";
import DocSourceButton from "./DocSourceButton";
import FieldError from "./FieldError";
import FieldLabel from "./FieldLabel";
import { FullEditorModal, FullEditorState } from "./FullEditorModal";
import Section from "./Section";
import { TextAreaField } from "./TextAreaField";

/**
 * Removes CR/LF characters from `raw` and maps `caret` (a code-unit offset
 * into `raw`) to the equivalent offset in the output.
 */
export function removeReturns(
  raw: string,
  caret: number
): { value: string; caret: number } {
  const beginning = raw.slice(0, caret);
  const end = raw.slice(caret);

  const newBeginning = beginning.replace(/[\r\n]+/g, "");
  const newEnd = end.replace(/[\r\n]+/g, "");

  return { value: newBeginning + newEnd, caret: newBeginning.length };
}

function StatCount({
  count,
  singular,
}: {
  count: number | undefined;
  singular: string;
}) {
  return (
    <>
      <b className="text-fg-strong font-medium">{count ?? "?"}</b>{" "}
      {count === 1 ? singular : `${singular}s`}
    </>
  );
}

/** The separator before the field at `i`: "a and b", "a, b, and c". */
function listSeparator(i: number, count: number): string {
  if (i === 0) return "";
  if (i < count - 1) return ", ";
  return count > 2 ? ", and " : " and ";
}

/** The page's label for each imported field, as the field labels below show it. */
const IMPORTED_FIELD_LABELS: Record<ImportedFieldV1, string> = {
  title: "Title",
  subtitle: "Subtitle",
  abstract: "Abstract",
  body: "Body",
};

/** Names the imported fields edited since the import, which a re-sync would replace. */
function EditedSinceImportBanner({ fields }: { fields: ImportedFieldV1[] }) {
  const isSingle = fields.length === 1;

  return (
    <p className="bg-butter-yellow-200 text-body-20 text-fg rounded-lg px-4 py-5">
      <strong className="text-fg-strong font-semibold">
        {fields.length} {isSingle ? "field has" : "fields have"} been edited
        since the last sync
      </strong>{" "}
      —{" "}
      {fields.map((field, i) => (
        <Fragment key={field}>
          {listSeparator(i, fields.length)}
          <em>{IMPORTED_FIELD_LABELS[field]}</em>
        </Fragment>
      ))}{" "}
      {isSingle ? "no longer matches" : "no longer match"} the Google Doc.
      Syncing replaces {isSingle ? "it" : "them"} with the doc&rsquo;s version.
    </p>
  );
}

export default function ContentSection({
  collapsed,
  onCommit,
  fieldErrors,
  fullEditor,
  hideBody,
  importStatusResult,
  isReadOnly,
  // onReviewStructure,
  onFullEditorChange,
  onReimport,
  onSwitchDoc,
  onToggleCollapse,
  publication,
  status,
}: {
  onCommit: Commit;
  fieldErrors: ValidationIssue[] | null;
  fullEditor: FullEditorState;
  onFullEditorChange: (state: FullEditorState) => void;
  publication: PublicationV1 | undefined;
  hideBody?: boolean;
  importStatusResult: UseQueryResult<ImportStatusResponse>;
  isReadOnly?: boolean;
  /** Re-imports the doc at `url` into the draft. */
  onReimport: (url: string) => Promise<void>;
  onSwitchDoc: () => void;
  // onReviewStructure: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  status: EditPublicationStatus;
}) {
  const openFullEditor = () =>
    onFullEditorChange({ open: true, focusRange: null });
  const closeFullEditor = () => onFullEditorChange({ open: false });

  // Lock editing the body until tdone importing.
  const isImporting =
    importStatusResult.data !== undefined && !importStatusResult.data.settled;
  const isBodyLocked = isReadOnly || isImporting;
  const isFullEditorOpen = fullEditor.open && !isBodyLocked;
  const body = publication?.body ?? "";
  // The full editor only edits the body, so other fields' ranges don't apply.
  const importDiagnostics = publication?.importDocument?.diagnostics;
  const bodyDiagnostics = useMemo(
    () => (importDiagnostics ?? []).filter((d) => d.path[0] === "body"),
    [importDiagnostics]
  );
  const wordCount = useMdWordCount(
    body,
    publication?.title ?? "",
    publication?.subtitle ?? "",
    publication?.abstract ?? ""
  );

  const titleId = useId();
  const subtitleId = useId();
  const abstractId = useId();
  const subtitleErrorId = useId();
  const titleErrorId = useId();
  const titleError = namespaceIssueMessage(fieldErrors, "title");
  const subtitle = publication?.subtitle ?? "";
  const subtitleTextLength = useMemo(
    () => getSubtitleTextLength(subtitle),
    [subtitle]
  );
  const isSubtitleTooLong = subtitleTextLength > SUBTITLE_TEXT_MAX_LEN;
  const serverSubtitleError = namespaceIssueMessage(fieldErrors, "subtitle");
  // The length rule is checked live here, so a stale server copy of it must
  // not linger after the subtitle has been shortened.
  const subtitleError = isSubtitleTooLong
    ? SUBTITLE_TEXT_TOO_LONG_MESSAGE
    : serverSubtitleError === SUBTITLE_TEXT_TOO_LONG_MESSAGE
      ? undefined
      : serverSubtitleError;

  const isLoading = status.status === "init";
  const googleDoc = linkedGoogleDoc(publication?.importDocument);
  const editedFields = googleDoc?.editedFields;
  const hasBody = Boolean(publication?.body?.trim());
  const serverBodyError = namespaceIssueMessage(fieldErrors, "body");
  // The server reports a missing body as a raw type error; say what to do instead.
  const bodyError =
    serverBodyError && !hasBody
      ? "Body is required to publish"
      : serverBodyError;

  return (
    <Section
      banner={
        editedFields?.length ? (
          <EditedSinceImportBanner fields={editedFields} />
        ) : null
      }
      collapsed={collapsed}
      id="content"
      kicker={googleDoc ? "Imported from Google Docs" : "Written in The Stacks"}
      note={
        googleDoc
          ? "Title, subtitle, abstract, and body came from your doc. Edits here stay in The Stacks and won't sync back."
          : "Title, subtitle, abstract, and body of your pub."
      }
      right={
        <DocSourceButton
          commit={onCommit}
          disabled={isBodyLocked}
          fieldErrors={fieldErrors}
          importDocument={googleDoc}
          isLoading={isLoading}
          uploadState={importStatusResult.data}
          onReimport={onReimport}
          onSwitch={onSwitchDoc}
        />
      }
      status={status}
      title="Content"
      onToggleCollapse={onToggleCollapse}
    >
      {isLoading ? (
        <div className="flex w-full items-center justify-center p-2">
          <LoadingSpinner size={24} />
        </div>
      ) : (
        <div className="divide-border flex flex-col divide-y [&>*]:py-8 [&>*:first-child]:pt-0 [&>*:last-child]:pb-0">
          <div id="newpub_title">
            <FieldLabel htmlFor={titleId} required>
              Title
            </FieldLabel>
            <TextAreaField
              aria-describedby={titleError ? titleErrorId : undefined}
              aria-invalid={titleError ? true : undefined}
              className="text-headline-30 w-full font-serif"
              disabled={isReadOnly}
              id={titleId}
              placeholder="Untitled pub"
              transform={removeReturns}
              value={publication?.title ?? ""}
              onChangeValue={(v) => onCommit("title", v)}
            />
            <FieldError id={titleErrorId} message={titleError} />
          </div>

          <div id="newpub_subtitle">
            <FieldLabel htmlFor={subtitleId}>Subtitle</FieldLabel>
            <TextAreaField
              aria-describedby={subtitleErrorId}
              aria-invalid={subtitleError ? true : undefined}
              className="text-body-60 w-full font-serif"
              disabled={isReadOnly}
              id={subtitleId}
              maxLength={SUBTITLE_MAX_LEN}
              placeholder="Add a subtitle"
              transform={removeReturns}
              value={subtitle}
              onChangeValue={(v) => onCommit("subtitle", v)}
            />
            <div id={subtitleErrorId}>
              <FieldError message={subtitleError} />
              {subtitle.length >= SUBTITLE_MAX_LEN && (
                <FieldError
                  message={`Reached the ${SUBTITLE_MAX_LEN}-character limit, including formatting`}
                />
              )}
            </div>
            {subtitleTextLength > SUBTITLE_TEXT_MAX_LEN - 30 && (
              <div
                className={cn(
                  "text-caption-20 text-fg-muted mt-1 text-right font-mono",
                  isSubtitleTooLong && "text-error-900"
                )}
              >
                {subtitleTextLength} / {SUBTITLE_TEXT_MAX_LEN}
              </div>
            )}
          </div>

          <div id="newpub_abstract">
            <FieldLabel htmlFor={abstractId}>Abstract</FieldLabel>
            <TextAreaField
              className="text-body-30 min-h-[calc(3lh+0.5rem)] w-full"
              disabled={isReadOnly}
              id={abstractId}
              placeholder="Summarize your pub in a few sentences"
              rows={2}
              value={publication?.abstract ?? ""}
              onChangeValue={(v) => onCommit("abstract", v)}
            />
          </div>

          <div id="newpub_body">
            <div className="mb-3 flex items-center justify-between gap-4">
              <div className="text-caption-30 text-gray-blue-400 font-mono">
                <FieldLabel className="mb-0 inline" required>
                  Body
                </FieldLabel>{" "}
                · {wordCount.toLocaleString("en-US")} words ·{" "}
                {wordCount === 0 ? 0 : Math.ceil(wordCount / 150)} min read
              </div>
              <Button
                className="shrink-0 gap-2"
                disabled={isBodyLocked}
                intent="outline"
                size="sm"
                onClick={openFullEditor}
              >
                <Eye aria-hidden className="size-4" />
                Open full editor
              </Button>
            </div>
            {hasBody ? (
              <div className="relative h-60 overflow-hidden">
                {/* Pointer-only convenience; the labelled button above is the accessible way in. Not a <button>: rendered figures contain their own buttons. */}
                <div
                  aria-hidden
                  className="cursor-pointer"
                  onClick={() => {
                    if (!isBodyLocked) openFullEditor();
                  }}
                >
                  <article
                    className="prose prose-compact no-margin-first-child pointer-events-none"
                    id="publication-body"
                    inert
                  >
                    {/* The renderer is slow, so it never runs while the full editor is open. */}
                    {!isFullEditorOpen && !hideBody && (
                      <MystRenderer myst={body} />
                    )}
                  </article>
                </div>
                <div className="to-surface pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-linear-to-b from-transparent" />
              </div>
            ) : (
              <button
                className="border-carbon-200 hover:border-gray-blue-900 text-body-20 text-fg-muted hover:text-fg flex w-full flex-col items-center gap-3 rounded-lg border border-dashed px-4 py-10 text-center transition-colors disabled:pointer-events-none"
                disabled={isReadOnly}
                type="button"
                onClick={openFullEditor}
              >
                <FileText aria-hidden className="size-5" />
                <span>
                  <span className="text-fg-strong block font-medium">
                    No body yet
                  </span>
                  Open the full editor to start writing
                  {!publication?.importDocument && ", or link a Google Doc"}.
                </span>
              </button>
            )}
            <FieldError message={bodyError} />

            {hasBody && (
              <p className="text-body-20 text-fg-muted mt-4 flex items-center gap-2.5 rounded-lg bg-gray-200 px-4 py-3">
                <Loader aria-hidden className="size-3.5 shrink-0" />
                <span>
                  Detected{" "}
                  <StatCount
                    count={publication?.stats?.sections}
                    singular="section"
                  />{" "}
                  ·{" "}
                  <StatCount
                    count={publication?.stats?.images}
                    singular="image"
                  />{" "}
                  ·{" "}
                  <StatCount
                    count={publication?.stats?.videos}
                    singular="video"
                  />{" "}
                  ·{" "}
                  <StatCount
                    count={publication?.stats?.iframes}
                    singular="iFrame"
                  />{" "}
                  ·{" "}
                  <StatCount
                    count={publication?.stats?.tables}
                    singular="table"
                  />{" "}
                  ·{" "}
                  <StatCount
                    count={publication?.stats?.citations}
                    singular="citation"
                  />
                  . Formatting preserved.
                </span>
              </p>
            )}
          </div>
        </div>
      )}
      <FullEditorModal
        closeModal={closeFullEditor}
        content={body}
        fileName={publication?.importDocument?.filename ?? ""}
        focusRange={fullEditor.open ? fullEditor.focusRange : null}
        importDiagnostics={bodyDiagnostics}
        open={isFullEditorOpen}
        status={status}
        title={publication?.title ?? ""}
        uploads={importStatusResult.data?.uploads}
        windowLabel="Full editor · Body"
        onChange={(text) => onCommit("body", text)}
        onOpenChange={(open) => (open ? openFullEditor() : closeFullEditor())}
      />
    </Section>
  );
}
