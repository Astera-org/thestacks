import { ImportUpload } from "@/apiv1/imports";
import {
  DiagnosticExcerptV1,
  ImportDiagnosticV1,
  SourceRangeV1,
} from "@/types/v1";

/** An upload that has finished, so its URL may have replaced its ref. */
type UploadedMedia = { ref: string; url: string };

/** Excerpt text, or an uploaded ref in it, which matches the ref or its URL. */
type Segment = string | UploadedMedia;

/** Copies of a problem's start past this many aren't looked at. */
const MAX_COPIES = 20;

/**
 * Returns a function telling where each diagnostic's problem is in `text`, the
 * field as it is now. A diagnostic's `range` is where the problem was when it
 * was imported, and any edit before it moves the problem, so it's found again
 * by the text in its `excerpt`:
 * - unedited, it's found where it was, or wherever other edits have moved it;
 *   if the same text appears more than once, the copy nearest `range` wins.
 * - `null` once the problem or the text around it has been edited (e.g. the
 *   problem was fixed), and when there's no excerpt to look for.
 *
 * Excerpts keep the importer's `raven-media://` refs, which uploads replace
 * with URLs, so a finished upload's ref matches either. An edit inside the
 * omitted middle of a long problem is only noticed if it changes its size.
 *
 * Plain string matching rather than a RegExp, so the time taken stays linear
 * in the length of `text` whatever the excerpt holds.
 */
export function createDiagnosticLocator(
  text: string,
  uploads: readonly ImportUpload[]
): (diagnostic: ImportDiagnosticV1) => SourceRangeV1 | null {
  const uploaded = uploads
    .map(({ ref, url }) => ({ ref, url: url ?? ref }))
    .sort((a, b) => b.ref.length - a.ref.length);

  return ({ excerpt, range }) => {
    if (!excerpt) return null;
    const before = split(excerpt.before, uploaded);
    const start = split(excerpt.highlight.start, uploaded);
    const first = [...before, ...start][0];
    if (!first) return null;

    const nearLine = range?.startLine ?? excerpt.startLine;
    let nearest: SourceRangeV1 | null = null;
    let copies = 0;
    for (
      let at = indexOf(text, first, 0);
      at !== -1 && copies < MAX_COPIES;
      at = indexOf(text, first, at + 1)
    ) {
      const from = matchAt(text, at, before);
      const startEnd = from === -1 ? -1 : matchAt(text, from, start);
      if (startEnd === -1) continue;
      copies++;

      const to = findProblemEnd(text, startEnd, excerpt, uploaded);
      if (to === -1) continue;
      const found = toRange(text, from, to);
      const distance = Math.abs(found.startLine - nearLine);
      if (!nearest || distance < Math.abs(nearest.startLine - nearLine)) {
        nearest = found;
      }
    }
    return nearest;
  };
}

/**
 * Where the problem whose `highlight.start` ends at `startEnd` ends, if the
 * rest of the excerpt follows it, or -1.
 */
function findProblemEnd(
  text: string,
  startEnd: number,
  { highlight, after }: DiagnosticExcerptV1,
  uploaded: UploadedMedia[]
): number {
  const afterSegments = split(after, uploaded);
  if (highlight.omittedChars === 0) {
    return matchAt(text, startEnd, afterSegments) === -1 ? -1 : startEnd;
  }

  // A long problem: the first `highlight.end` followed by `after` is its end,
  // if what's between the two halves is the size of what was left out.
  const end = split(highlight.end, uploaded);
  if (end.length === 0) return -1;
  for (
    let at = indexOf(text, end[0], startEnd);
    at !== -1;
    at = indexOf(text, end[0], at + 1)
  ) {
    const problemEnd = matchAt(text, at, end);
    if (problemEnd === -1 || matchAt(text, problemEnd, afterSegments) === -1) {
      continue;
    }
    const middle = text.slice(startEnd, at);
    return matchesOmittedSize(middle, highlight, uploaded) ? problemEnd : -1;
  }
  return -1;
}

/** `part` split into text and the uploaded refs in it. */
function split(part: string, uploaded: UploadedMedia[]): Segment[] {
  let segments: Segment[] = [part];
  for (const media of uploaded) {
    segments = segments.flatMap((segment) => {
      if (typeof segment !== "string") return [segment];
      const [first, ...rest] = segment.split(media.ref);
      return [first, ...rest.flatMap((text) => [media, text])];
    });
  }
  return segments.filter((segment) => segment !== "");
}

/** The strings a segment matches: an uploaded ref matches its URL too. */
function forms(segment: Segment): string[] {
  return typeof segment === "string" ? [segment] : [segment.ref, segment.url];
}

/** Where `segment` next appears in `text`, from `from` on, or -1. */
function indexOf(text: string, segment: Segment, from: number): number {
  const found = forms(segment)
    .map((form) => text.indexOf(form, from))
    .filter((index) => index !== -1);
  return found.length > 0 ? Math.min(...found) : -1;
}

/** Where `segments` end if they appear in `text` at `at`, or -1. */
function matchAt(text: string, at: number, segments: Segment[]): number {
  let end = at;
  for (const segment of segments) {
    const form = forms(segment).find((f) => text.startsWith(f, end));
    if (form === undefined) return -1;
    end += form.length;
  }
  return end;
}

/**
 * Whether the text between a long problem's two halves has the size of what
 * the excerpt left out, counting uploaded URLs as the refs they replaced.
 */
function matchesOmittedSize(
  middle: string,
  { omittedChars, omittedLines }: DiagnosticExcerptV1["highlight"],
  uploaded: UploadedMedia[]
): boolean {
  const asImported = uploaded.reduce(
    (text, { ref, url }) => text.split(url).join(ref),
    middle
  );
  return (
    asImported.length === omittedChars &&
    asImported.split("\n").length - 1 === omittedLines
  );
}

function toRange(text: string, from: number, to: number): SourceRangeV1 {
  const start = toPosition(text, from);
  const end = toPosition(text, to);
  return {
    startLine: start.line,
    startColumn: start.column,
    endLine: end.line,
    endColumn: end.column,
  };
}

/** 1-based line and column (in UTF-16 code units, like `SourceRangeV1`). */
function toPosition(text: string, offset: number) {
  const before = text.slice(0, offset);
  return {
    line: before.split("\n").length,
    column: offset - before.lastIndexOf("\n"),
  };
}
