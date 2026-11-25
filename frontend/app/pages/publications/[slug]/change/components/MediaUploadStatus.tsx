import { ImportStatusResponse } from "@/apiv1/imports";
import { StatusPill, StatusPillStatus } from "@/components/StatusPill";
import { FIGURES_SECTION_ID } from "./FiguresSection";

/** How much of the import's media has uploaded; links to the figures. */
export function MediaUploadStatus({
  uploadState,
}: {
  uploadState: ImportStatusResponse | undefined;
}) {
  if (!uploadState || uploadState.uploads.length === 0) return null;

  const status: StatusPillStatus = uploadState.uploads.some(
    (u) => u.status === "failed"
  )
    ? "danger"
    : uploadState.uploads.every((u) => u.status === "completed")
      ? "success"
      : "warning";

  const uploadPercent = Math.round(
    (100 * uploadState.uploads.filter((u) => u.status === "completed").length) /
      uploadState.uploads.length
  );
  const label = `${uploadPercent}% media uploaded`;
  return (
    <a
      // Starts with the visible text so voice control can target it.
      aria-label={`${label}: show figures`}
      href={`#${FIGURES_SECTION_ID}`}
    >
      <StatusPill animate={status === "warning"} status={status}>
        {label}
      </StatusPill>
    </a>
  );
}
