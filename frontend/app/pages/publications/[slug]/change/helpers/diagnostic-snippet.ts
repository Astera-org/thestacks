import { ImportUpload } from "@/apiv1/imports";
import { DiagnosticExcerptV1, SourceRangeV1 } from "@/types/v1";

/** An excerpt laid out to show, with "…" wherever text was left out. */
export type Snippet = {
  text: string;
  /** Where the problem is in `text`. */
  from: number;
  to: number;
  /** The field's line number for each line of `text`, counting from 1. */
  lineNumber: (line: number) => number;
};

/**
 * Lays out `excerpt` to show. Lines are numbered from where the problem is now
 * (`range`, from `createDiagnosticLocator`), or from where it was imported
 * when it can't be found. Uploaded media refs show as their URLs, as they do
 * in the body.
 */
export function buildSnippet(
  excerpt: DiagnosticExcerptV1,
  range: SourceRangeV1 | null,
  uploads: readonly ImportUpload[]
): Snippet {
  const show = (part: string) => {
    // Ensure we don't accidentally overwrite `raven-media://10` with `://1`
    // even though we use ulids normally.
    const sortedUploads = [...uploads].sort(({ ref: refA }, { ref: refB }) => {
      if (refB.length !== refA.length) {
        return refB.length - refA.length;
      }
      // If lengths are equal, sort in reverse alphabetical order (Z to A)
      return refB.localeCompare(refA);
    });
    return sortedUploads.reduce(
      (text, { ref, url }) => (url ? text.split(ref).join(url) : text),
      part
    );
  };
  const { before, highlight, after, clippedStart, clippedEnd } = excerpt;
  const cut = highlight.omittedChars > 0;

  const lead = (clippedStart ? "…" : "") + show(before);
  const problemStart = show(highlight.start);
  const problem = problemStart + (cut ? "…" : "") + show(highlight.end);
  const text = lead + problem + show(after) + (clippedEnd ? "…" : "");

  const firstLine = range
    ? range.startLine - countBreaks(before)
    : excerpt.startLine;
  // The line with the "…" in a long problem; lines after it skip the lines
  // that were left out.
  const cutLine = cut ? countBreaks(lead + problemStart) + 1 : Infinity;

  return {
    text,
    from: lead.length,
    to: lead.length + problem.length,
    lineNumber: (line) =>
      firstLine + line - 1 + (line > cutLine ? highlight.omittedLines : 0),
  };
}

function countBreaks(text: string): number {
  return text.split("\n").length - 1;
}
