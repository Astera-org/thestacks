import { SAFE_IMAGE_MIME_TYPES } from "@/lib/constants";

const SAFE_PROTOCOLS = new Set(["http:", "https:", "mailto:"]);

/** Resolves relative URLs, so only a URL's own scheme decides if it is safe. */
const RELATIVE_BASE = "https://relative.invalid";

/**
 * The URL when it is safe to put in `href` or `src`: web, mail and relative
 * URLs, plus inline images of known-safe types when
 * `allowDataImage` is set. AST content comes from authors, so anything else
 * (`javascript:`, other `data:`) is refused.
 */
export function safeUrl(
  url: unknown,
  { allowDataImage = false }: { allowDataImage?: boolean } = {}
): string | undefined {
  if (typeof url !== "string") return undefined;
  const trimmed = url.trim();
  if (trimmed === "") return undefined;
  if (
    allowDataImage &&
    SAFE_IMAGE_MIME_TYPES.some((type) => trimmed.startsWith(`data:${type}`))
  ) {
    return trimmed;
  }
  try {
    return SAFE_PROTOCOLS.has(new URL(trimmed, RELATIVE_BASE).protocol)
      ? trimmed
      : undefined;
  } catch {
    return undefined;
  }
}
