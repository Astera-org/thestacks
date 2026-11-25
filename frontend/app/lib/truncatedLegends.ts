/** A figure legend that shows only the start of its text. */
export interface TruncatedLegend {
  expand: () => void;
}

/**
 * Figure legends that are truncated right now, keyed by the legend element,
 * so a comment in the text a legend hides can be revealed by expanding it.
 */
export const truncatedLegends = new WeakMap<HTMLElement, TruncatedLegend>();

/**
 * Wraps the copy of a truncated legend's last shown block that's cut to the
 * limit. Its text duplicates text in the hidden part, so comments aren't
 * anchored in it.
 */
export const LEGEND_CUT_CLASS = "legend-cut";

/**
 * Wraps the legend's text from the block the truncation falls in onwards.
 * `hidden="until-found"` while the legend is truncated, so the browser's
 * find in page can still match, and reveal, it.
 */
export const LEGEND_REST_CLASS = "legend-rest";

/**
 * Dispatched on `window` after a legend truncates, expands or collapses, so
 * comment anchors and their bubbles can follow the text it now shows.
 */
export const LEGEND_CONTENT_CHANGED_EVENT = "stacks-legend-content-changed";
