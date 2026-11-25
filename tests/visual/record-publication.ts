// Records the API responses a logged-out visitor's browser and the server
// render need for one publication page, as static JSON for the full-page suite.
// Usage: THE_STACKS_API_URL=https://<host>/api node visual/record-publication.ts <slug>
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

import { TIMELINE } from "./recordings.ts";

const API = process.env.THE_STACKS_API_URL?.replace(/\/$/, "");
const slug = process.argv[2];
if (!API || !slug) {
  throw new Error(
    "Usage: THE_STACKS_API_URL=https://<host>/api node visual/record-publication.ts <slug>",
  );
}
// The slug names a folder that gets replaced, so it must stay inside RECORDINGS.
if (!/^[a-z0-9][a-z0-9-]*$/i.test(slug)) {
  throw new Error(`Not a publication slug: ${JSON.stringify(slug)}`);
}
const RECORDINGS = path.join(import.meta.dirname, "publications");
const OUT = path.join(RECORDINGS, slug);
if (path.dirname(OUT) !== RECORDINGS) {
  throw new Error(`Refusing to write outside ${RECORDINGS}: ${OUT}`);
}

// Everything is written to a temporary folder (dot-prefixed, so recordings.ts
// skips it) and swapped in at the end, so a failed run keeps the old recording.
mkdirSync(RECORDINGS, { recursive: true });
const TMP = mkdtempSync(path.join(RECORDINGS, `.${slug}-`));

// Files mirror the request path under /api, so a fixture server can answer a
// request by its path alone. Query strings are ignored on replay.
async function get<T>(apiPath: string): Promise<T> {
  const response = await fetch(`${API}${apiPath}`);
  if (!response.ok) throw new Error(`${response.status} for GET ${apiPath}`);
  return (await response.json()) as T;
}

// Every write stays inside TMP, whatever IDs or paths the API returned.
function write(file: string, contents: string | Buffer): void {
  const target = path.resolve(TMP, file);
  if (!target.startsWith(`${TMP}${path.sep}`)) {
    throw new Error(`Refusing to write outside ${TMP}: ${file}`);
  }
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, contents);
}

// Mirrors assetUrl in frontend/app/api/utils.ts: the URL the browser requests
// for a stored asset (absolute, data:, or a same-origin path), or null.
function assetUrl(stored: string): string | null {
  const value = stored.trim();
  if (!value) return null;
  if (/^(https?:\/\/|data:)/.test(value)) return value;
  if (value.startsWith("avatars/") && !value.startsWith("api/files/")) {
    return `/api/files/${value}`;
  }
  return value.startsWith("/") ? value : `/${value}`;
}

// A recorded response: a downloaded file, or a 404 replayed as such.
type Recorded =
  | { file: string; contentType: string }
  | { status: 404; contentType: string };

// Saved under a hash of its key (a URL or a request path), so keys that differ
// only in their query string get separate files.
function fileFor(dir: string, key: string): string {
  return path.join(
    dir,
    createHash("sha256").update(key).digest("hex").slice(0, 32),
  );
}

// With allowMissing, a 404 is recorded rather than thrown, so replay returns it.
async function download(
  url: string,
  file: string,
  { allowMissing = false } = {},
): Promise<Recorded> {
  const response = await fetch(url);
  if (allowMissing && response.status === 404) {
    return { status: 404, contentType: "application/json" };
  }
  if (!response.ok) throw new Error(`${response.status} for ${url}`);
  write(file, Buffer.from(await response.arrayBuffer()));
  return {
    file,
    contentType:
      response.headers.get("content-type") ?? "application/octet-stream",
  };
}

function save(apiPath: string, body: unknown): void {
  write(
    path.join("api", `${apiPath.split("?")[0]}.json`),
    `${JSON.stringify(body, null, 2)}\n`,
  );
}

type Comment = Record<string, unknown> & {
  comment_id: number;
  created_at: string;
  updated_at?: string | null;
};
interface Publication {
  id: number;
  created_at: string;
  abstract?: string | null;
  body: string;
  contributors: { avatar?: unknown }[];
  orgs?: { avatar?: unknown }[];
  versions?: { version_number: number; created_at: string }[];
}
interface CommentPage {
  pagination: { total: number; page: number; per_page: number };
  items: Comment[];
}

// Payloads are checked as they arrive, so a malformed one fails the run before
// anything replaces the existing recording.
function assertPublication(value: unknown): asserts value is Publication {
  const p = value as Partial<Publication> | null;
  if (
    !p ||
    !Number.isInteger(p.id) ||
    typeof p.body !== "string" ||
    typeof p.created_at !== "string" ||
    !Array.isArray(p.contributors) ||
    (p.orgs != null && !Array.isArray(p.orgs)) ||
    (p.abstract != null && typeof p.abstract !== "string")
  ) {
    throw new Error("Malformed publication payload");
  }
}

function assertCommentPage(value: unknown): asserts value is CommentPage {
  const c = value as Partial<CommentPage> | null;
  if (!c || !Array.isArray(c.items) || !Number.isInteger(c.pagination?.total)) {
    throw new Error("Malformed comments payload");
  }
}

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const iso = (ms: number) => new Date(ms).toISOString();

// Publications are seeded through the API, so their dates are whenever they
// were seeded and would change the page on every re-record. They are rewritten
// onto TIMELINE, keeping their order: versions a day apart from publishedAt,
// then comments a day apart after the latest version, an edit an hour later.
function normalizeDates(publication: Publication, comments: Comment[]): void {
  publication.created_at = iso(TIMELINE.publishedAt);
  const versions = [...(publication.versions ?? [])].sort(
    (a, b) => a.version_number - b.version_number,
  );
  versions.forEach((version, i) => {
    version.created_at = iso(TIMELINE.publishedAt + i * DAY);
  });

  const commentsFrom = TIMELINE.publishedAt + (versions.length - 1) * DAY;
  const byCreation = [...comments].sort(
    (a, b) =>
      Date.parse(a.created_at) - Date.parse(b.created_at) ||
      a.comment_id - b.comment_id,
  );
  byCreation.forEach((comment, i) => {
    const createdAt = commentsFrom + (i + 1) * DAY;
    comment.created_at = iso(createdAt);
    if (comment.updated_at) comment.updated_at = iso(createdAt + HOUR);
  });
  if (commentsFrom + byCreation.length * DAY >= TIMELINE.now) {
    throw new Error(
      "Too many versions and comments to fit before TIMELINE.now",
    );
  }
}

// URLs in the body are HTML-escaped (e.g. "&amp;" in a query string); the
// browser requests the decoded URL, so that's what is downloaded and indexed.
const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
};
function unescapeHtml(text: string): string {
  return text.replace(
    /&(#x[0-9a-f]+|#[0-9]+|[a-z]+);/gi,
    (entity, name: string) => {
      if (name[0] !== "#") return ENTITIES[name.toLowerCase()] ?? entity;
      const code =
        name[1].toLowerCase() === "x"
          ? parseInt(name.slice(2), 16)
          : parseInt(name.slice(1), 10);
      return String.fromCodePoint(code);
    },
  );
}

try {
  // The server render's loader. Contributors come inside this payload.
  const publicationPath = `/publications/${slug}`;
  const { publication } = await get<{ publication: unknown }>(publicationPath);
  assertPublication(publication);

  // Images the body shows (:::image, Markdown and <img>), saved with a
  // media.json map from URL to file for the harness to serve. Audio, video and
  // iframes aren't recorded: specs mask them.
  const text = `${publication.abstract ?? ""}\n${publication.body}`;
  const imageUrls = new Set(
    [
      ...text.matchAll(/^:{3,}image\{[^}\n]*\bsrc=["']?([^"'\s}]+)/gm),
      ...text.matchAll(/!\[[^\]]*\]\((https?:[^)\s]+)/g),
      ...text.matchAll(/<img\b[^>]*\bsrc=["']([^"']+)/gi),
    ]
      .map(([, url]) => unescapeHtml(url))
      // Inline data: images make no request, so there is nothing to record.
      .filter((url) => !url.startsWith("data:")),
  );
  const media: Record<string, Recorded> = {};
  for (const url of imageUrls) {
    media[url] = await download(url, fileFor("media", url));
  }

  // The browser's comments request (the page asks with no query, the comments
  // list with per_page=250); every page is merged into one response.
  const commentsPath = `/comments/publication/${publication.id}`;
  const items: Comment[] = [];
  for (let page = 1; ; page++) {
    const batch = await get<unknown>(
      `${commentsPath}?page=${page}&per_page=250`,
    );
    assertCommentPage(batch);
    items.push(...batch.items);
    if (items.length >= batch.pagination.total || batch.items.length === 0) {
      break;
    }
  }
  normalizeDates(publication, items);
  save(publicationPath, { publication });
  save(commentsPath, {
    pagination: { total: items.length, page: 1, per_page: items.length },
    items,
  });

  // Avatars of contributors, orgs and commenters, at the URL the browser asks
  // for. Absolute ones are media; /api/files/... ones go in files.json. Other
  // same-origin paths come from the frontend server, as on the live site. A
  // missing avatar shows initials on the live page, so a 404 is recorded too.
  const avatars = new Set(
    [
      ...publication.contributors.map((c) => c.avatar),
      ...(publication.orgs ?? []).map((o) => o.avatar),
      ...items.map((c) => c.avatar),
    ].filter((a): a is string => typeof a === "string"),
  );
  const files: Record<string, Recorded> = {};
  for (const avatar of avatars) {
    const url = assetUrl(avatar);
    if (!url || url.startsWith("data:")) continue;
    if (/^https?:\/\//.test(url)) {
      media[url] = await download(url, fileFor("media", url), {
        allowMissing: true,
      });
      continue;
    }
    const { pathname } = new URL(url, "http://recording");
    if (!pathname.startsWith("/api/files/")) continue;
    files[pathname] = await download(
      `${API}${pathname.slice("/api".length)}`,
      fileFor("files", pathname),
      { allowMissing: true },
    );
  }
  write("media.json", `${JSON.stringify(media, null, 2)}\n`);
  write("files.json", `${JSON.stringify(files, null, 2)}\n`);

  // Only the origin, so credentials in THE_STACKS_API_URL never get written.
  const source = new URL(API).origin;
  write(
    "recording.json",
    `${JSON.stringify({ slug, source, recordedAt: new Date().toISOString() }, null, 2)}\n`,
  );

  // Everything that can fail is done; only the swap and the log remain.
  const summary = `Recorded ${slug}: ${publication.contributors.length} contributors, ${items.length} comments, ${imageUrls.size} images, ${avatars.size} avatars → ${OUT}`;

  // Swap the new recording in; the old one is removed only after that.
  const previous = `${TMP}.previous`;
  const hadPrevious = existsSync(OUT);
  if (hadPrevious) renameSync(OUT, previous);
  try {
    renameSync(TMP, OUT);
  } catch (error) {
    if (hadPrevious) renameSync(previous, OUT);
    throw error;
  }
  rmSync(previous, { recursive: true, force: true });
  console.log(summary);
} catch (error) {
  rmSync(TMP, { recursive: true, force: true });
  throw error;
}
