import { PUBLICATION_TYPE_TAGS } from "@/lib/constants";
import { clsx, type ClassValue } from "clsx";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { extendTailwindMerge } from "tailwind-merge";

dayjs.extend(utc);

function isCustomTextSize(cn: string) {
  return ["headline", "body", "caption"].some((val) => cn.startsWith(val));
}

const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: [isCustomTextSize]
    }
  }
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function capitalize(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Convert a string to sentence case: first letter uppercase, the rest
 * lowercase (e.g. "not actively updating" -> "Not actively updating").
 */
export function toSentenceCase(str: string) {
  return capitalize(str.toLowerCase());
}

/**
 * Replace underscores with spaces (e.g. "not_actively_updating" ->
 * "not actively updating").
 */
export function snakeToSpace(str: string) {
  return str.replace(/_/g, " ");
}

/**
 * Format a snake_case enum value as a sentence-case string (e.g.
 * "NOT_ACTIVELY_UPDATING" -> "Not actively updating").
 */
export function enumToSentenceCase(str: string) {
  return toSentenceCase(snakeToSpace(str));
}

export function formatDate(
  date: string,
  format: string = "MMM D, YYYY h:mm A"
) {
  return dayjs.utc(date).local().format(format);
}

/**
 * Formats the time-of-day portion of a date using the browser's own locale,
 * so the 12/24-hour convention follows the user's browser rather than a
 * hardcoded token.
 */
export function formatTime(date: string): string {
  return new Date(date).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit"
  });
}

export function isCurrentYear(date: string): boolean {
  return dayjs(date).isSame(dayjs(), "year");
}

export function isWithinDays(date: string, days: number): boolean {
  return dayjs().diff(dayjs(date), "day") < days;
}

/**
 * From a list of publication tags, return the publication types: the tags
 * from the input that case-insensitively match a fixed allowlist, keeping
 * each tag's original casing and order from the input.
 */
export function filterPublicationTypeTags(tags: string[]): string[] {
  const typeTags = new Set(
    PUBLICATION_TYPE_TAGS.map((tag) => tag.toLowerCase())
  );
  return tags.filter((tag) => typeTags.has(tag.toLowerCase()));
}

/**
 * Download a file from the given URL and save it to the user's local machine
 * with the given filename.
 *
 * Notes:
 * - This roundabout method is required to set custom filenames for URLs that
 *   are cross-origin requests.
 * - If the `url` is a cross-origin request, CORS must be disabled for the current
 *   origin on the server.
 *
 * @param src - The URL of the file to download.
 * @param filename - The filename to save the file as.
 */
export async function downloadFromUrl(src: string, filename: string) {
  try {
    const response = await fetch(src, {
      mode: "cors",
      cache: "no-cache"
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch: ${response.status} ${response.statusText}`
      );
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.style.display = "none";

    document.body.appendChild(link);
    link.click();

    // Clean up the link and the blob URL.
    link.remove();
    URL.revokeObjectURL(url);
  } catch {
    // The blob download needs CORS, which cross-origin media (e.g. S3 without
    // CORS headers) may not grant. Fall back to opening the asset so the user
    // can still save it. The download attribute is ignored cross-origin.
    window.open(src, "_blank", "noopener,noreferrer");
  }
}
