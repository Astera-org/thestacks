export const CONTRIBUTOR_ROLES = [
  "Conceptualization",
  "Critical feedback",
  "Data curation",
  "Editing",
  "Experimental design",
  "Formal analysis",
  "Investigation",
  "Methodology",
  "Project administration",
  "Resources",
  "Software",
  "Supervision",
  "Validation",
  "Visualization",
  "Writing"
] as const;
export type ContributorRole = (typeof CONTRIBUTOR_ROLES)[number];

/**
 * Tailwind's default min-width breakpoints, in pixels. Keep in sync with the
 * `--breakpoint-*` theme tokens (only `--breakpoint-container` is overridden).
 */
export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536
} as const;

export type Breakpoint = keyof typeof BREAKPOINTS;

/**
 * Publication type tags: the set of tags that describe a publication's type
 * (e.g. "Dataset", "Method") and are surfaced prominently on publication
 * cards. Any other tag is treated as non-essential and left out of that
 * condensed view.
 */
export const PUBLICATION_TYPE_TAGS = [
  "Dataset",
  "Idea",
  "Resource",
  "Method",
  "Negative data",
  "Informative failure",
  "Observation",
  "Open question",
  "Result",
  "Perspective"
];

/**
 * Raster image MIME types considered safe to accept as file uploads or to
 * render from an embedded `data:` URI. Excludes `image/svg+xml`, which can
 * carry scripts and is not safe to treat the same way.
 */
export const SAFE_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp"
];
