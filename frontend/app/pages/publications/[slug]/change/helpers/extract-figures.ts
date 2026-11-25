import { SourceRangeV1 } from "@/types/v1";
import { MEDIA_TYPES } from "@thestacks/myst-renderer";
import type { Nodes } from "mdast";
import type { ContainerDirective } from "mdast-util-directive";
import { toString } from "mdast-util-to-string";
import remarkDirective from "remark-directive";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkParse from "remark-parse";
import { unified } from "unified";
import type { Position } from "unist";
import { SKIP, visit } from "unist-util-visit";

export type FigureMediaKind =
  (typeof MEDIA_TYPES)[keyof typeof MEDIA_TYPES] | "file";

export type BodyFigureMedia = {
  kind: FigureMediaKind;
  src: string | null;
  alt: string | null;
  /** Only `file` directives have one. */
  filename: string | null;
  position: Position;
};

export type BodyFigure = {
  /** True for media that isn't inside a `figure` directive. */
  standalone: boolean;
  id: string | null;
  /** E.g. "Figure 1", from the `label` attribute or else the caption. */
  label: string | null;
  /** The `type` attribute, or what the figure holds when it has none. */
  type: string | null;
  /** The caption's first paragraph as plain text, without its label. */
  caption: string | null;
  /** The first media in the figure, if it has any. */
  media: BodyFigureMedia | null;
  position: Position;
};

// The same syntax extensions MystRenderer parses with.
const parser = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkDirective)
  .use(remarkMath);

const MEDIA_KINDS = new Set<string>([...Object.values(MEDIA_TYPES), "file"]);

// The labels rehypeExtractFigureCaption recognises.
const CAPTION_LABEL = /^((?:Table|Figure|Video)\s+\d+)[.:]\s*/;

/** The figures, and media outside figures, in a MyST body in document order. */
export function extractFigures(body: string): BodyFigure[] {
  const figures: BodyFigure[] = [];
  visit(parser.parse(body), (node) => {
    if (isContainerDirective(node, "figure")) {
      figures.push(toFigure(node));
      return SKIP;
    }
    const media = toMedia(node);
    if (!media) return;
    figures.push({
      standalone: true,
      id: null,
      label: null,
      type: media.kind,
      caption: null,
      media,
      position: media.position,
    });
    return SKIP;
  });
  return figures;
}

/** A figure's or medium's position as the range the editor selects. */
export function toSourceRange({ start, end }: Position): SourceRangeV1 {
  return {
    startLine: start.line,
    startColumn: start.column,
    endLine: end.line,
    endColumn: end.column,
  };
}

/** The id of a figure's row in the figures section, to link to it. */
export function figureRowId({ position: { start } }: BodyFigure): string {
  return `figure-${start.line}-${start.column}`;
}

/** The innermost figure (or standalone media) that `range` is inside. */
export function findFigure(
  figures: readonly BodyFigure[],
  range: SourceRangeV1
): BodyFigure | null {
  let found: BodyFigure | null = null;
  for (const figure of figures) {
    const { start, end } = figure.position;
    const inside =
      comparePoints(start, range.startLine, range.startColumn) <= 0 &&
      comparePoints(end, range.endLine, range.endColumn) >= 0;
    // Later starts are deeper in, as figures are in document order.
    if (inside) found = figure;
  }
  return found;
}

function comparePoints(
  { line, column }: Position["start"],
  otherLine: number,
  otherColumn: number
): number {
  return line - otherLine || column - otherColumn;
}

function toFigure(figure: ContainerDirective): BodyFigure {
  // Cast so TS doesn't incorrectly narrow it to null, as typescript cannot
  // understand this variable being set in the callback for `visit`.
  let media = null as BodyFigureMedia | null;
  let figcaption: ContainerDirective | undefined;
  let hasTable = false;

  visit(figure, (node) => {
    if (node === figure) return;
    if (isContainerDirective(node, "figcaption")) {
      figcaption ??= node;
      return SKIP;
    }
    if (isTable(node)) hasTable = true;
    const found = toMedia(node);
    if (!found) return;
    media ??= found;
    return SKIP;
  });

  const attrs = figure.attributes ?? {};
  const firstCaptionPart = figcaption?.children[0];
  const captionText = firstCaptionPart ? toString(firstCaptionPart).trim() : "";
  const captionLabel = captionText.match(CAPTION_LABEL)?.[1] ?? null;
  const label = attrs.label || captionLabel;
  const caption =
    captionLabel && captionLabel === label
      ? captionText.replace(CAPTION_LABEL, "")
      : captionText;

  return {
    standalone: false,
    id: attrs.id || null,
    label,
    type: attrs.type || media?.kind || (hasTable ? "table" : null),
    caption: caption || null,
    media,
    position: figure.position!,
  };
}

function toMedia(node: Nodes): BodyFigureMedia | null {
  if (node.type === "image") {
    return {
      kind: "image",
      src: node.url || null,
      alt: node.alt || null,
      filename: null,
      position: node.position!,
    };
  }
  if (node.type !== "containerDirective" || !MEDIA_KINDS.has(node.name)) {
    return null;
  }
  const attrs = node.attributes ?? {};
  return {
    kind: node.name as FigureMediaKind,
    src: attrs.src || null,
    alt: attrs.alt || null,
    filename: attrs.filename || null,
    position: node.position!,
  };
}

function isContainerDirective(
  node: Nodes,
  name: string
): node is ContainerDirective {
  return node.type === "containerDirective" && node.name === name;
}

function isTable(node: Nodes): boolean {
  return (
    node.type === "table" ||
    (node.type === "html" && /<table[\s>]/i.test(node.value))
  );
}
