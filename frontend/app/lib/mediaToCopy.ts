// Mirrors `_extractMediaUrlsToUpload` in the Raven backend (backend-ts/src/lib/media.ts),
// which copies these files to S3 when a publication is saved. Keep the two in sync.

const COPIED_MEDIA_DOMAINS = [
  "docs.google.com",
  "drive.google.com",
  "googleusercontent.com"
];

const MEDIA_DIRECTIVE_PATTERN =
  /\{[^}]*src\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s}]+))[^}]*\}/g;

function isCopiedMedia(url: string): boolean {
  let hostname: string;
  try {
    hostname = new URL(url).hostname.toLowerCase();
  } catch {
    return false;
  }
  const domainName = hostname.split(".").slice(-2).join(".");
  return COPIED_MEDIA_DOMAINS.some((d) => d === hostname || d === domainName);
}

/**
 * Counts the distinct media files in a MyST body that the backend will
 * download and copy to S3 when the publication is saved.
 */
export function countMediaToCopy(body: string): number {
  const urls = new Set<string>();
  for (const match of body.matchAll(MEDIA_DIRECTIVE_PATTERN)) {
    const url = match[1] || match[2] || match[3];
    if (url && isCopiedMedia(url)) urls.add(url);
  }
  return urls.size;
}
