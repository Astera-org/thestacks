import { ImportStatusResponse, ImportUploadSource } from "@/apiv1/imports";
import { Skeleton } from "@/components/Skeleton";
import Button from "@/components/stacks-ui/Button";
import CollapsibleRegion from "@/components/stacks-ui/CollapsibleRegion";
import {
  StatusPill,
  StatusPillStatus,
  StatusPulse,
} from "@/components/StatusPill";
import { EditPublicationStatus } from "@/hooks/use-edit-publication/types";
import { cn } from "@/lib/utils";
import { PublicationV1, SourceRangeV1 } from "@/types/v1";
import { UseQueryResult } from "@tanstack/react-query";
import type { LucideIcon } from "lucide-react";
import {
  AppWindow,
  AudioLines,
  AudioLinesOff,
  Film,
  Frame,
  ImageIcon,
  ImageOff,
  Paperclip,
  SquareOff,
  StickyNoteOff,
  Table,
  VideoOff,
} from "lucide-react";
import { useId, useMemo } from "react";
import {
  BodyFigure,
  BodyFigureMedia,
  FigureMediaKind,
  figureRowId,
  toSourceRange,
} from "../helpers/extract-figures";
import {
  createFigureMediaResolver,
  FigureMediaStatus,
  ResolvedFigureMedia,
} from "../helpers/resolve-figure-media";
import FieldError from "./FieldError";
import Section from "./Section";

const STATUS_PILLS: Record<
  FigureMediaStatus,
  { status: StatusPillStatus; label: string; animate?: boolean }
> = {
  pending: { status: "warning", label: "Queued", animate: true },
  uploading: { status: "warning", label: "Uploading", animate: true },
  ready: { status: "success", label: "Stored" },
  failed: { status: "danger", label: "Upload failed" },
  unresolved: { status: "danger", label: "Upload missing" },
  embedded: { status: "pending", label: "Embedded" },
  external: { status: "pending", label: "External" },
  missing: { status: "danger", label: "No source" },
  invalid: { status: "danger", label: "Invalid source" },
};

const NEEDS_ATTENTION = new Set<FigureMediaStatus>([
  "failed",
  "unresolved",
  "missing",
  "invalid",
]);

const KINDS: Record<
  FigureMediaKind | "table" | "figure",
  { name: string; Icon: LucideIcon; ErrorIcon?: LucideIcon }
> = {
  image: {
    name: "Image",
    ErrorIcon: ImageOff,
    Icon: ImageIcon,
  },
  video: { name: "Video", ErrorIcon: VideoOff, Icon: Film },
  audio: {
    name: "Audio",
    ErrorIcon: AudioLinesOff,
    Icon: AudioLines,
  },
  iframe: { name: "Embed", ErrorIcon: SquareOff, Icon: AppWindow },
  file: {
    name: "File",
    ErrorIcon: StickyNoteOff,
    Icon: Paperclip,
  },
  table: { name: "Table", Icon: Table },
  figure: { name: "Figure", Icon: Frame },
};

/** The section's anchor, e.g. for linking to it with `#figures`. */
export const FIGURES_SECTION_ID = "figures";

type ResolvedMedia = BodyFigureMedia & ResolvedFigureMedia;

type FigureRowData = {
  figure: BodyFigure;
  /** Its media needs fixing, so it stays visible when collapsed. */
  hasError: boolean;
  /** The figure's media, resolved. Null for figures without any, like tables. */
  resolvedMedia: ResolvedMedia | null;
};

export default function FiguresSection({
  collapsed,
  figures,
  importStatusResponse,
  isReadOnly,
  publication,
  status,
  onShowInEditor,
  onToggleCollapse,
}: {
  collapsed: boolean;
  /** The body's figures, from `extractFigures`. */
  figures: readonly BodyFigure[];
  importStatusResponse: UseQueryResult<ImportStatusResponse>;
  isReadOnly?: boolean;
  publication: PublicationV1 | undefined;
  status: EditPublicationStatus;
  /** True until the import's uploads have been fetched. */
  onShowInEditor: (range: SourceRangeV1) => void;
  onToggleCollapse: () => void;
}) {
  const regionId = useId();

  const uploads = importStatusResponse.data?.uploads;
  const mediaAssets = publication?.mediaAssets;
  const { allRows, errorRows, okRows } = useMemo(() => {
    const resolve = createFigureMediaResolver({
      uploads: uploads ?? [],
      mediaAssets: mediaAssets ?? [],
    });
    const allRows = figures.map((figure): FigureRowData => {
      const resolvedMedia: ResolvedMedia | null = figure.media && {
        ...figure.media,
        ...resolve(figure.media.src),
      };
      return {
        figure,
        hasError:
          resolvedMedia !== null &&
          NEEDS_ATTENTION.has(
            displayStatus(resolvedMedia, importStatusResponse.isLoading)
          ),
        resolvedMedia,
      };
    });
    return {
      allRows,
      errorRows: allRows.filter((f) => f.hasError),
      okRows: allRows.filter((f) => !f.hasError),
    };
  }, [figures, uploads, mediaAssets, importStatusResponse.isLoading]);

  if (!publication || allRows.length === 0) return null;

  const isImporting =
    importStatusResponse.data !== undefined &&
    !importStatusResponse.data.settled;
  const isBodyLocked = Boolean(isReadOnly) || isImporting;
  const attentionCount = allRows.filter(
    ({ resolvedMedia }) =>
      resolvedMedia && NEEDS_ATTENTION.has(resolvedMedia.status)
  ).length;

  return (
    <Section
      collapsed={collapsed}
      collapseExternally
      collapsible={okRows.length > 0}
      id={FIGURES_SECTION_ID}
      kicker="Check your media"
      note="Detailed information about each figure in the body, including import status. If there are issues, fix them in the source document."
      right={
        <span className="text-caption-20 text-fg font-mono">
          {allRows.length} {allRows.length === 1 ? "figure" : "figures"}
          {attentionCount > 0 && ` · ${attentionCount} to fix`}
        </span>
      }
      status={status}
      statusPill={
        <ProcessingStatusPills
          rows={allRows}
          uploadsLoading={importStatusResponse.isLoading}
        />
      }
      title="Figures"
      onToggleCollapse={onToggleCollapse}
    >
      <div
        className={cn(
          "flex flex-col motion-reduce:transition-all",
          collapsed && errorRows.length === 0 ? "gap-0" : "gap-6"
        )}
      >
        <div className="max-h-150 overflow-y-auto">
          <div
            className={
              errorRows.length > 0 ? "border-border rounded-xl border" : ""
            }
          >
            {errorRows.length > 0 && (
              <ul aria-label="Figures that need fixing" className="group">
                {errorRows.map((row, idx) => (
                  <FigureRow
                    key={`${row.figure.position.start.line}:${row.figure.position.start.column}`}
                    hideBorder={idx === 0}
                    isBodyLocked={isBodyLocked}
                    row={row}
                    uploadsLoading={importStatusResponse.isLoading}
                    onShowInEditor={onShowInEditor}
                  />
                ))}
              </ul>
            )}
            {okRows.length > 0 && (
              <CollapsibleRegion
                id={regionId}
                isOpen={!collapsed}
                onOpenChange={(isOpen) => {
                  if (collapsed === isOpen) {
                    onToggleCollapse();
                  }
                }}
              >
                <ul
                  aria-label={
                    errorRows.length > 0 ? "Other figures" : "Figures"
                  }
                  className={cn(
                    "group",
                    errorRows.length > 0
                      ? ""
                      : "border-border rounded-xl border"
                  )}
                >
                  {okRows.map((row, idx) => (
                    <FigureRow
                      key={`${row.figure.position.start.line}:${row.figure.position.start.column}`}
                      hideBorder={idx === 0 && errorRows.length === 0}
                      isBodyLocked={isBodyLocked}
                      row={row}
                      uploadsLoading={importStatusResponse.isLoading}
                      onShowInEditor={onShowInEditor}
                    />
                  ))}
                </ul>
              </CollapsibleRegion>
            )}
          </div>
        </div>
        <FiguresBrief
          figures={allRows}
          uploadsLoading={importStatusResponse.isLoading}
        />
      </div>
    </Section>
  );
}

const IN_PROGRESS = new Set<FigureMediaStatus>(["pending", "uploading"]);

/** How many figures have finished processing, and how many have errors. */
function ProcessingStatusPills({
  rows,
  uploadsLoading,
}: {
  rows: FigureRowData[];
  uploadsLoading: boolean;
}) {
  // Figures without media, like tables, are part of the body.
  const statuses = rows.map(({ resolvedMedia }) =>
    resolvedMedia ? displayStatus(resolvedMedia, uploadsLoading) : "embedded"
  );
  const total = statuses.length;
  const settled = statuses.filter((s) => !IN_PROGRESS.has(s)).length;
  const errors = statuses.filter((s) => NEEDS_ATTENTION.has(s)).length;
  const processed = total - errors;

  return (
    <div
      aria-label="Processing status"
      className="flex flex-wrap items-center gap-2"
      role="group"
    >
      {settled < total ? (
        <StatusPill animate status="warning">
          {`Processing: ${settled} / ${total} figures`}
        </StatusPill>
      ) : (
        <StatusPill status="success">
          {`${processed} ${processed === 1 ? "figure" : "figures"} processed`}
        </StatusPill>
      )}
      {errors > 0 && (
        <StatusPill status="danger">
          {`${errors} ${errors === 1 ? "Error" : "Errors"}`}
        </StatusPill>
      )}
    </div>
  );
}

// For errors the import doesn't send a message with.
const LOCAL_ERRORS: Partial<Record<FigureMediaStatus, string>> = {
  failed: "This upload failed. Replace the media in the editor.",
  unresolved: "No upload matches this media. Replace it in the editor.",
  missing: "This media has no source. Add one in the editor.",
  invalid: "This source isn't a link or an upload. Replace it in the editor.",
};

function FigureRow({
  hideBorder,
  isBodyLocked,
  row: { figure, hasError, resolvedMedia },
  uploadsLoading,
  onShowInEditor,
}: {
  hideBorder?: boolean;
  isBodyLocked: boolean;
  row: FigureRowData;
  uploadsLoading: boolean;
  onShowInEditor: (range: SourceRangeV1) => void;
}) {
  const errorId = useId();
  const uploadError = resolvedMedia?.upload?.error;
  const errorMessage = !hasError
    ? null
    : uploadError
      ? `${uploadError.message}`
      : resolvedMedia && LOCAL_ERRORS[resolvedMedia.status];
  const originalLink =
    resolvedMedia?.status === "failed"
      ? sourceLink(resolvedMedia.upload?.source)
      : null;
  const kind =
    resolvedMedia?.kind ?? (figure.type === "table" ? "table" : "figure");

  const { name, Icon, ErrorIcon } = KINDS[kind];
  const IconToShow = (hasError && ErrorIcon) || Icon;
  const title =
    figure.label ??
    (figure.standalone
      ? `${name} outside a figure`
      : `Unlabelled ${name.toLowerCase()}`);
  const details = [name, ...(resolvedMedia ? mediaDetails(resolvedMedia) : [])];
  // Refs can only be checked once the import's uploads have loaded.
  const isChecking = uploadsLoading && resolvedMedia?.status === "unresolved";
  // Figures without media, like tables, are part of the body.
  const pill = STATUS_PILLS[resolvedMedia?.status ?? "embedded"];
  const thumbnail = resolvedMedia && thumbnailUrl(resolvedMedia);

  return (
    <li
      className={cn(
        "border-border flex min-h-0 scroll-mt-28 flex-col overflow-hidden border-t px-4 py-3 md:scroll-mt-36 md:px-5",
        hideBorder ? "border-t-0" : ""
      )}
      // The import issues section links here.
      id={figureRowId(figure)}
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {thumbnail ? (
            <img
              alt=""
              className="size-11 shrink-0 rounded-md bg-gray-200 object-cover"
              loading="lazy"
              src={thumbnail}
            />
          ) : (
            <span
              className={cn(
                "flex size-11 shrink-0 items-center justify-center rounded-md bg-gray-200",
                hasError ? "text-error-800" : "text-fg-muted"
              )}
            >
              <IconToShow aria-hidden className="size-5" />
            </span>
          )}
          <div className="min-w-0">
            <p className="text-body-20 text-fg-strong truncate font-medium">
              {title}
            </p>
            {figure.caption && (
              <p className="text-body-20 text-fg-muted truncate">
                {figure.caption}
              </p>
            )}
            <p className="text-caption-20 text-fg-muted truncate font-mono">
              {details.join(" · ")}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {isChecking ? (
            <>
              <Skeleton className="w-24 rounded-full" />
              <span className="sr-only">Checking upload</span>
            </>
          ) : (
            <StatusPill animate={pill.animate} status={pill.status}>
              {pill.label}
            </StatusPill>
          )}
          <Button
            // Starts with the visible text so voice control can target it.
            aria-describedby={errorMessage ? errorId : undefined}
            aria-label={`Show in editor: ${title}`}
            className="shrink-0"
            disabled={isBodyLocked}
            intent="outline"
            size="sm"
            onClick={() => onShowInEditor(toSourceRange(figure.position))}
          >
            Show in editor
          </Button>
        </div>
      </div>
      {errorMessage && (
        <div className="ml-14 flex flex-col items-start gap-1">
          <FieldError id={errorId} message={errorMessage} />
          {originalLink && (
            <a
              className="text-caption-30 text-fg font-medium underline underline-offset-4"
              href={originalLink.href}
              rel="noopener noreferrer"
              target="_blank"
            >
              Open the original file{" "}
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          )}
        </div>
      )}
    </li>
  );
}

// Where media came from matters until it has been copied.
const COPYING = new Set<FigureMediaStatus>(["pending", "uploading", "failed"]);

function mediaDetails({ asset, src, status, upload }: ResolvedMedia): string[] {
  if (asset) {
    return [
      formatBytes(asset.byteSize),
      asset.width && asset.height ? `${asset.width}×${asset.height}` : null,
      asset.durationMs ? formatDuration(asset.durationMs) : null,
    ].filter((detail) => detail !== null);
  }
  if (upload?.source && COPYING.has(status)) {
    return [sourceLabel(upload.source)];
  }
  if (status === "external" && src) return [new URL(src).hostname];
  if (status === "invalid" && src) return [`"${truncate(src, 40)}"`];
  return [];
}

function sourceLabel(source: ImportUploadSource): string {
  if (source.type === "bytes") return "embedded in the doc";
  const link = sourceLink(source);
  return link ? `from ${link.hostname}` : `from "${truncate(source.url, 40)}"`;
}

/** The source's URL, when it's a web link the user can open. */
function sourceLink(source: ImportUploadSource | undefined): URL | null {
  if (source?.type !== "url") return null;
  try {
    const url = new URL(source.url);
    return url.protocol === "http:" || url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

function thumbnailUrl({
  asset,
  kind,
  src,
  status,
  upload,
}: ResolvedMedia): string | null {
  if (kind !== "image") return null;
  if (asset) return asset.publicUrl;
  if (upload?.url) return upload.url;
  if (status === "external" || status === "embedded") return src;
  return null;
}

const BYTES = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });

function formatBytes(bytes: number): string {
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${BYTES.format(value)} ${units[unit]}`;
}

function formatDuration(ms: number): string {
  const seconds = Math.round(ms / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function truncate(text: string, length: number): string {
  return text.length > length ? `${text.slice(0, length)}…` : text;
}

/** The status to show, treating refs as queued until uploads have loaded. */
function displayStatus(
  { status }: ResolvedMedia,
  uploadsLoading: boolean
): FigureMediaStatus {
  return uploadsLoading && status === "unresolved" ? "pending" : status;
}

type BriefStat = {
  label: string;
  count: number;
  status: StatusPillStatus;
  animate?: boolean;
  /** Per-status breakdown, e.g. "2 failed · 1 no source". */
  detail?: string;
};

function FiguresBrief({
  figures,
  uploadsLoading,
}: {
  figures: FigureRowData[];
  uploadsLoading: boolean;
}) {
  const counts = new Map<FigureMediaStatus, number>();
  for (const { resolvedMedia } of figures) {
    const status = resolvedMedia
      ? displayStatus(resolvedMedia, uploadsLoading)
      : "embedded";
    counts.set(status, (counts.get(status) ?? 0) + 1);
  }
  const count = (...statuses: FigureMediaStatus[]) =>
    statuses.reduce((sum, s) => sum + (counts.get(s) ?? 0), 0);
  const breakdown = (...statuses: FigureMediaStatus[]) =>
    statuses
      .filter((s) => count(s) > 0)
      .map((s) => `${count(s)} ${STATUS_PILLS[s].label.toLowerCase()}`)
      .join(" · ");

  const stored = count("ready");
  // Embedded and external media have nothing to process, so they start done.
  const completed = count("ready", "embedded", "external");
  const total = figures.length;
  const inProgress = count("pending", "uploading");
  const needsFixing = count(...NEEDS_ATTENTION);
  const progressLabelId = useId();

  const stats: BriefStat[] = [
    { label: "Stored", count: stored, status: "success" },
    {
      label: "In progress",
      count: inProgress,
      status: "warning",
      animate: inProgress > 0,
      detail: breakdown("uploading", "pending"),
    },
    {
      label: "Need fixing",
      count: needsFixing,
      status: "danger",
      detail: breakdown(...NEEDS_ATTENTION),
    },
    {
      label: "Embedded or external",
      count: count("embedded", "external"),
      status: "success",
      detail: breakdown("embedded", "external"),
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      {total > 0 && (
        <div className="flex flex-col gap-2">
          <div className="text-caption-20 text-fg flex justify-between gap-4 font-mono">
            <span id={progressLabelId}>Figures processed</span>
            <span>
              {completed}/{total}
            </span>
          </div>
          <div
            aria-labelledby={progressLabelId}
            aria-valuemax={total}
            aria-valuemin={0}
            aria-valuenow={completed}
            aria-valuetext={`${completed} of ${total}`}
            className="h-1.5 overflow-hidden rounded-full bg-gray-200"
            role="progressbar"
          >
            <div
              className="bg-carbon-800 flex h-full flex-row items-stretch justify-end overflow-hidden rounded-full transition-[width] motion-reduce:transition-none"
              style={{
                width: `${((completed + needsFixing) / total) * 100}%`,
              }}
            >
              {needsFixing > 0 && (
                <div
                  className="bg-error-800 h-full transition-[width] motion-reduce:transition-none"
                  style={{
                    width: `${(needsFixing / (completed + needsFixing)) * 100}%`,
                  }}
                />
              )}
            </div>
          </div>
        </div>
      )}
      <ul
        aria-label="Figure summary"
        className="grid grid-cols-2 gap-3 md:grid-cols-4"
      >
        {stats.map((stat) => (
          <li
            key={stat.label}
            className={cn(
              "border-border flex flex-col gap-1 rounded-xl border px-4 py-3",
              stat.count === 0 && "opacity-60"
            )}
          >
            <span className="text-caption-20 text-fg flex items-center gap-2 font-mono">
              <StatusPulse animate={stat.animate} status={stat.status} />
              {stat.label}
            </span>
            <span className="text-headline-30 text-fg-strong font-serif">
              {stat.count}
            </span>
            {stat.detail && (
              <span className="text-caption-20 text-fg-muted truncate font-mono">
                {stat.detail}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
