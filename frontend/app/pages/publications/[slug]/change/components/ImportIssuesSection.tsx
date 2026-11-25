import { ImportStatusResponse, ImportUpload } from "@/apiv1/imports";
import Button from "@/components/stacks-ui/Button";
import CollapsibleRegion from "@/components/stacks-ui/CollapsibleRegion";
import { StatusPill } from "@/components/StatusPill";
import { EditPublicationStatus } from "@/hooks/use-edit-publication/types";
import { cn } from "@/lib/utils";
import { ImportDiagnosticV1, PublicationV1, SourceRangeV1 } from "@/types/v1";
import { UseQueryResult } from "@tanstack/react-query";
import { AlertTriangle, ChevronDown, Info } from "lucide-react";
import { useId, useMemo, useState } from "react";
import {
  BodyFigure,
  figureRowId,
  findFigure,
} from "../helpers/extract-figures";
import { createDiagnosticLocator } from "../helpers/locate-diagnostics";
import DiagnosticSnippet from "./DiagnosticSnippet";
import Section from "./Section";

/** The section's anchor, e.g. for linking to it with `#import-issues`. */
export const IMPORT_ISSUES_SECTION_ID = "import-issues";

const FIELDS = ["title", "subtitle", "abstract", "body"];
const FIELD_NAMES: Record<string, string> = {
  title: "Title",
  subtitle: "Subtitle",
  abstract: "Abstract",
  body: "Body",
};

/** One of the import's diagnostics, and where it is in the body now. */
type Place = {
  diagnostic: ImportDiagnosticV1;
  /** Null outside the body, or when the problem can't be found there. */
  range: SourceRangeV1 | null;
};

/** Diagnostics with the same message, shown once with every place it's at. */
type Issue = {
  severity: ImportDiagnosticV1["severity"];
  message: string;
  places: Place[];
};

export default function ImportIssuesSection({
  collapsed,
  figures,
  importStatusResponse,
  isReadOnly,
  publication,
  status,
  onShowFigure,
  onShowInEditor,
  onToggleCollapse,
}: {
  collapsed: boolean;
  /** The body's figures, to link issues inside one to its row. */
  figures: readonly BodyFigure[];
  importStatusResponse: UseQueryResult<ImportStatusResponse>;
  isReadOnly?: boolean;
  publication: PublicationV1 | undefined;
  status: EditPublicationStatus;
  /** Makes sure a figure's row is showing before the link jumps to it. */
  onShowFigure: () => void;
  onShowInEditor: (range: SourceRangeV1) => void;
  onToggleCollapse: () => void;
}) {
  const regionId = useId();
  // Only the draft's own import has diagnostics, so a draft showing an
  // earlier version's import has none.
  const diagnostics = publication?.importDocument?.diagnostics;
  const body = publication?.body ?? "";
  const uploads = importStatusResponse.data?.uploads;
  const { errors, warnings } = useMemo(() => {
    const locate = createDiagnosticLocator(body, uploads ?? []);
    const places = (diagnostics ?? []).map((diagnostic): Place => ({
      diagnostic,
      range: diagnostic.path[0] === "body" ? locate(diagnostic) : null,
    }));
    const issues = groupByMessage(places.sort(byPosition));
    return {
      errors: issues.filter((issue) => issue.severity === "error"),
      warnings: issues.filter((issue) => issue.severity === "warning"),
    };
  }, [body, diagnostics, uploads]);

  const isImporting =
    importStatusResponse.data !== undefined &&
    !importStatusResponse.data.settled;
  const isBodyLocked = Boolean(isReadOnly) || isImporting;
  const rowProps = {
    figures,
    isBodyLocked,
    uploads: uploads ?? [],
    uploadsLoading: importStatusResponse.isLoading,
    onShowFigure,
    onShowInEditor,
  };

  // Do not show section if there are no issues.
  if (!publication || errors.length + warnings.length === 0) return null;

  return (
    <Section
      collapsed={collapsed}
      collapseExternally
      collapsible={warnings.length > 0}
      id={IMPORT_ISSUES_SECTION_ID}
      kicker="Check your import"
      note="We found issues with the source document during import."
      status={status}
      statusPill={
        <IssueCountPills
          errors={countPlaces(errors)}
          warnings={countPlaces(warnings)}
        />
      }
      title="Import issues"
      onToggleCollapse={onToggleCollapse}
    >
      <div className="max-h-150 overflow-y-auto">
        <div
          className={errors.length > 0 ? "border-border rounded-xl border" : ""}
        >
          {errors.length > 0 && (
            <ul aria-label="Import errors">
              {errors.map((issue, idx) => (
                <IssueRow
                  key={issue.message}
                  hideBorder={idx === 0}
                  issue={issue}
                  {...rowProps}
                />
              ))}
            </ul>
          )}
          {warnings.length > 0 && (
            <CollapsibleRegion
              id={regionId}
              isOpen={!collapsed}
              onOpenChange={(isOpen) => {
                if (collapsed === isOpen) onToggleCollapse();
              }}
            >
              <ul
                aria-label="Import warnings"
                className={
                  errors.length > 0 ? "" : "border-border rounded-xl border"
                }
              >
                {warnings.map((issue, idx) => (
                  <IssueRow
                    key={issue.message}
                    hideBorder={idx === 0 && errors.length === 0}
                    issue={issue}
                    {...rowProps}
                  />
                ))}
              </ul>
            </CollapsibleRegion>
          )}
        </div>
      </div>
    </Section>
  );
}

function IssueCountPills({
  errors,
  warnings,
}: {
  errors: number;
  warnings: number;
}) {
  return (
    <div
      aria-label="Issue counts"
      className="flex flex-wrap items-center gap-2"
      role="group"
    >
      {errors > 0 && (
        <StatusPill status="danger">
          {`${errors} ${errors === 1 ? "Error" : "Errors"}`}
        </StatusPill>
      )}
      {warnings > 0 && (
        <StatusPill status="warning">
          {`${warnings} ${warnings === 1 ? "Warning" : "Warnings"}`}
        </StatusPill>
      )}
    </div>
  );
}

function IssueRow({
  figures,
  hideBorder,
  isBodyLocked,
  issue: { message, places, severity },
  uploads,
  uploadsLoading,
  onShowFigure,
  onShowInEditor,
}: {
  figures: readonly BodyFigure[];
  hideBorder?: boolean;
  isBodyLocked: boolean;
  issue: Issue;
  uploads: readonly ImportUpload[];
  uploadsLoading: boolean;
  onShowFigure: () => void;
  onShowInEditor: (range: SourceRangeV1) => void;
}) {
  const messageId = useId();
  const isError = severity === "error";
  const Icon = isError ? AlertTriangle : Info;

  return (
    <li
      className={cn(
        "border-border flex flex-col gap-2 border-t px-4 py-3 md:px-5",
        hideBorder && "border-t-0"
      )}
    >
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-md bg-gray-200",
            isError ? "text-error-800" : "text-fg-muted"
          )}
        >
          <Icon aria-hidden className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="text-body-20 text-fg-strong font-medium" id={messageId}>
            {message}
          </p>
          {places.length > 1 && (
            <p className="text-caption-20 text-fg-muted font-mono">
              {places.length} places
            </p>
          )}
        </div>
      </div>
      <ul className="ml-14 flex flex-col gap-1">
        {places.map((place, idx) => (
          <PlaceRow
            key={idx}
            figure={place.range && findFigure(figures, place.range)}
            isBodyLocked={isBodyLocked}
            label={placeLabel(place, uploadsLoading)}
            messageId={messageId}
            place={place}
            uploads={uploads}
            onShowFigure={onShowFigure}
            onShowInEditor={onShowInEditor}
          />
        ))}
      </ul>
    </li>
  );
}

/** One place an issue is at, which opens to show the text around it. */
function PlaceRow({
  figure,
  isBodyLocked,
  label,
  messageId,
  place: { diagnostic, range },
  uploads,
  onShowFigure,
  onShowInEditor,
}: {
  /** The figure the issue is in, if any, which gets a link to its row. */
  figure: BodyFigure | null;
  isBodyLocked: boolean;
  label: string;
  /** The issue's message, which describes the row's button. */
  messageId: string;
  place: Place;
  uploads: readonly ImportUpload[];
  onShowFigure: () => void;
  onShowInEditor: (range: SourceRangeV1) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const snippetId = useId();
  const { excerpt } = diagnostic;

  return (
    <li className="flex flex-col gap-2">
      <div className="flex min-h-8 items-center justify-between gap-3">
        {excerpt ? (
          <button
            aria-controls={expanded ? snippetId : undefined}
            aria-expanded={expanded}
            className="text-caption-20 text-fg-muted inline-flex items-center gap-1.5 text-left font-mono"
            type="button"
            onClick={() => setExpanded(!expanded)}
          >
            <ChevronDown
              aria-hidden
              className={cn(
                "size-3.5 shrink-0 transition-transform motion-reduce:transition-none",
                !expanded && "-rotate-90"
              )}
            />
            {label}
          </button>
        ) : (
          <span className="text-caption-20 text-fg-muted font-mono">
            {label}
          </span>
        )}
        <div className="flex shrink-0 items-center gap-2">
          {figure && (
            <Button asChild intent="outline" size="sm">
              <a
                aria-describedby={messageId}
                aria-label={`Show figure: ${figure.label ?? label}`}
                href={`#${figureRowId(figure)}`}
                // The row may be in the figures section's collapsed list.
                onClick={onShowFigure}
              >
                Show figure
              </a>
            </Button>
          )}
          {range && (
            <Button
              // Starts with the visible text so voice control can target it.
              aria-describedby={messageId}
              aria-label={`Show in editor: ${label}`}
              disabled={isBodyLocked}
              intent="outline"
              size="sm"
              onClick={() => onShowInEditor(range)}
            >
              Show in editor
            </Button>
          )}
        </div>
      </div>
      {/* Mounted only while open: each one is a CodeMirror instance. */}
      {expanded && excerpt && (
        <DiagnosticSnippet
          diagnostic={diagnostic}
          excerpt={excerpt}
          id={snippetId}
          label={label}
          range={range}
          uploads={uploads}
        />
      )}
    </li>
  );
}

/** The field, and the lines when the problem has been found in the body. */
function placeLabel({ diagnostic, range }: Place, uploadsLoading: boolean) {
  const field = String(diagnostic.path[0] ?? "");
  const name = FIELD_NAMES[field] ?? "Document";
  if (range) {
    const { startLine, endLine } = range;
    return startLine === endLine
      ? `${name}, line ${startLine}`
      : `${name}, lines ${startLine}–${endLine}`;
  }
  // Excerpts with media refs can only be matched once the uploads have loaded.
  if (field === "body" && diagnostic.excerpt && !uploadsLoading) {
    return `${name}, changed since import`;
  }
  return name;
}

/** By field in page order, then by line. */
function byPosition(a: Place, b: Place): number {
  const field = (place: Place) =>
    FIELDS.indexOf(String(place.diagnostic.path[0]));
  const line = (place: Place) =>
    place.range?.startLine ?? place.diagnostic.range?.startLine ?? 0;
  return field(a) - field(b) || line(a) - line(b);
}

function groupByMessage(places: Place[]): Issue[] {
  const issues = new Map<string, Issue>();
  for (const place of places) {
    const { severity, message } = place.diagnostic;
    const key = `${severity}:${message}`;
    const issue = issues.get(key) ?? { severity, message, places: [] };
    issue.places.push(place);
    issues.set(key, issue);
  }
  return [...issues.values()];
}

function countPlaces(issues: Issue[]): number {
  return issues.reduce((sum, issue) => sum + issue.places.length, 0);
}
