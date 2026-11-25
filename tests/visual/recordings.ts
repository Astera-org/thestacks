// Lookups into the publications recorded by record-publication.ts, shared by
// the fixture server (the server render's backend) and the harness (the
// browser's requests).
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const RECORDINGS = path.join(import.meta.dirname, "publications");

/** Recording folders; dot-prefixed entries are the recorder's temporary ones. */
function recordings(): string[] {
  if (!existsSync(RECORDINGS)) return [];
  return readdirSync(RECORDINGS, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
    .map((entry) => path.join(RECORDINGS, entry.name));
}

/**
 * The fixed timeline every recording's dates are rewritten onto, so the dates
 * on a page don't change when it is re-recorded. Tests pin the clock to `now`.
 */
export const TIMELINE = {
  publishedAt: Date.parse("2026-09-01T12:00:00.000Z"),
  now: Date.parse("2026-09-11T12:00:00.000Z"),
};

/** A recorded publication, from its recording.json. */
export interface Recording {
  slug: string;
  /** When it was recorded. Shown in the report only. */
  recordedAt: string;
  /** The API origin it was recorded from, e.g. a staging host. */
  source: string;
}

/** The recorded publications, sorted by slug so test order is stable. */
export function recordedPublications(): Recording[] {
  return recordings()
    .map((recording) => {
      const manifest = path.join(recording, "recording.json");
      const { slug, recordedAt, source } = JSON.parse(
        readFileSync(manifest, "utf8"),
      ) as Partial<Record<keyof Recording, unknown>>;
      // The folder name is the slug the fixture server and specs rely on.
      if (
        slug !== path.basename(recording) ||
        typeof recordedAt !== "string" ||
        Number.isNaN(Date.parse(recordedAt)) ||
        typeof source !== "string"
      ) {
        throw new Error(
          `Malformed ${manifest}: expected its folder's slug, an ISO recordedAt and a source`,
        );
      }
      return { slug, recordedAt, source };
    })
    .sort((a, b) => a.slug.localeCompare(b.slug));
}

/** The recorded file for a request path such as /api/publications/<slug>. */
export function recordedFile(pathname: string): string | null {
  for (const recording of recordings()) {
    const file = path.join(recording, `${pathname}.json`);
    // Only recorded API responses: refuse anything outside the recording's
    // api folder, e.g. "/api/%2e%2e/recording" resolving to recording.json.
    const api = path.join(recording, "api");
    if (file.startsWith(`${api}${path.sep}`) && existsSync(file)) return file;
  }
  return null;
}

// A recorded response: a file, or a 404 replayed without a body (an avatar the
// backend didn't have). Manifests store files relative to their recording.
export type Entry =
  | { path: string; contentType: string }
  | { status: 404; contentType?: string };
type Lookup = Map<string, Entry>;

/** A manifest entry as an Entry; anything but a file or a 404 is rejected. */
function toEntry(
  recording: string,
  manifest: string,
  key: string,
  value: unknown,
): Entry {
  const v = value as {
    file?: unknown;
    contentType?: unknown;
    status?: unknown;
  };
  if (v && typeof v.file === "string" && typeof v.contentType === "string") {
    return { path: path.join(recording, v.file), contentType: v.contentType };
  }
  if (v && v.status === 404) {
    return typeof v.contentType === "string"
      ? { status: 404, contentType: v.contentType }
      : { status: 404 };
  }
  throw new Error(
    `Malformed entry ${JSON.stringify(key)} in ${manifest}: expected a file with a contentType, or status 404`,
  );
}

/** Merges one manifest (media.json, files.json) from every recording. */
function loadManifests(name: string): Lookup {
  const lookup: Lookup = new Map();
  for (const recording of recordings()) {
    const manifest = path.join(recording, name);
    if (!existsSync(manifest)) continue;
    const entries: unknown = JSON.parse(readFileSync(manifest, "utf8"));
    if (!entries || typeof entries !== "object" || Array.isArray(entries)) {
      throw new Error(`Malformed ${manifest}: expected an object of entries`);
    }
    for (const [key, value] of Object.entries(entries)) {
      lookup.set(key, toEntry(recording, manifest, key, value));
    }
  }
  return lookup;
}

const media = loadManifests("media.json");
const files = loadManifests("files.json");

/** The recorded copy of an external image (body images), by exact URL. */
export function recordedMedia(url: string): Entry | null {
  return media.get(url) ?? null;
}

/** A recorded non-JSON API response (avatars), by path: /api/files/... */
export function recordedApiFile(pathname: string): Entry | null {
  return files.get(pathname) ?? null;
}
