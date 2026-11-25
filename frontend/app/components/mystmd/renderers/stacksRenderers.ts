import {
  type NodeRenderersValidated,
  validateRenderers
} from "@myst-theme/providers";
import { DEFAULT_RENDERERS } from "myst-to-react";
import { ADMONITION_RENDERERS } from "./admonitions";
import { CITATION_RENDERERS } from "./citations";
import { CODE_RENDERERS } from "./code";
import { FIGURE_RENDERERS } from "./figures";
import { MATH_RENDERERS } from "./math";
import { TABLE_RENDERERS } from "./table";
import { TABS_RENDERERS } from "./tabs";
import { TEXT_RENDERERS } from "./text";

/**
 * myst-to-react's renderers with Stacks versions of the node types in the
 * `initial-myst-support` plan. Each overridden type is replaced outright
 * rather than merged (`mergeRenderers`), which would keep the defaults'
 * selector-specific renderers, such as the GitHub and Wikipedia link
 * previews, and let them win over ours.
 */
export const STACKS_RENDERERS: NodeRenderersValidated = {
  ...DEFAULT_RENDERERS,
  ...validateRenderers({
    ...TEXT_RENDERERS,
    ...CITATION_RENDERERS,
    ...FIGURE_RENDERERS,
    ...TABLE_RENDERERS,
    ...ADMONITION_RENDERERS,
    ...TABS_RENDERERS,
    ...CODE_RENDERERS,
    ...MATH_RENDERERS
  })
};
