import katex from "katex";
// Registers `\ce` and `\pu` for chemistry, as `myst build` does.
import "katex/contrib/mhchem";
import type { GenericNode } from "myst-common";
import { useMemo } from "react";
import { useMystmdContext } from "../MystmdContext";

/** The environments KaTeX numbers row by row, unless starred. */
const NUMBERED_ENVIRONMENTS =
  /\\(begin|end)\{(equation|align|alignat|gather)\}/g;

/**
 * MyST numbers a math block once, as a whole (`node.enumerator`), so the
 * per-row numbers KaTeX adds for `align` and its kin would be a second,
 * conflicting numbering. Starring the environments turns KaTeX's off.
 */
function unnumbered(tex: string): string {
  return tex.replace(NUMBERED_ENVIRONMENTS, "\\$1{$2*}");
}

/**
 * Raven sends math as TeX (`value`); KaTeX 0.16 renders it here, matching the
 * KaTeX CSS the site already loads, with the macros the document's `math`
 * frontmatter defines. KaTeX escapes its input, and `trust` is off, so
 * commands such as `\href` cannot inject links.
 */
function useKatex(value: unknown, displayMode: boolean): string {
  const { mathMacros } = useMystmdContext();
  return useMemo(
    () =>
      katex.renderToString(unnumbered(String(value ?? "")), {
        displayMode,
        // A copy, since KaTeX writes `\gdef` definitions into `macros`, and
        // one expression must not change how the next one renders.
        macros: { ...mathMacros },
        throwOnError: false
      }),
    [value, displayMode, mathMacros]
  );
}

function MathBlock({ node }: { node: GenericNode }) {
  const html = useKatex(node.value, true);
  return (
    <div
      className="mystmd-math"
      id={typeof node.html_id === "string" ? node.html_id : undefined}
    >
      <div dangerouslySetInnerHTML={{ __html: html }} />
      {node.enumerator && (
        <span className="mystmd-equation-number">
          ({String(node.enumerator)})
        </span>
      )}
    </div>
  );
}

function InlineMath({ node }: { node: GenericNode }) {
  const html = useKatex(node.value, false);
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

export const MATH_RENDERERS = { math: MathBlock, inlineMath: InlineMath };
