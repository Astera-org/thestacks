import DiffMatchPatch from "diff-match-patch";

export interface Anchor {
  selection: string;
  prefix?: string;
  suffix?: string;
  maxEdits?: number;
}

export interface LocatedAnchor {
  start: number;
  end: number;
  score: number;
}

export interface CommentAnchorNode {
  node: Node;
  startOffset: number;
  endOffset: number;
}

const dmp = new DiffMatchPatch();

/**
 * Compute similarity between two strings on a scale 0 – 1
 * using Levenshtein distance normalised by the longer length.
 */
function similarity(a: string, b: string): number {
  if (!a && !b) return 1;
  if (!a || !b) return 0;
  const diffs = dmp.diff_main(a, b);
  const edits = dmp.diff_levenshtein(diffs);
  return 1 - edits / Math.max(a.length, b.length);
}

export function findNodeWithCommentAnchor(
  root: HTMLElement,
  anchor: Anchor
): {
  nodes: CommentAnchorNode[];
} | null {
  // Build a flat list of text nodes with their cumulative offsets so we can
  // locate the anchor in the full document text and then map the result back
  // to individual DOM text nodes.
  const textNodes: Array<{ node: Node; offset: number; length: number }> = [];
  let totalLength = 0;

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
  let n: Node | null = walker.nextNode();
  while (n) {
    const len = n.textContent?.length ?? 0;
    if (len > 0) {
      textNodes.push({ node: n, offset: totalLength, length: len });
      totalLength += len;
    }
    n = walker.nextNode();
  }

  if (textNodes.length === 0) return null;

  // Concatenate all text so locateComment can use prefix/suffix context to
  // pick the correct occurrence when the selection text appears more than
  // once in the document.
  const fullText = textNodes.map((t) => t.node.textContent).join("");

  const located = locateComment(fullText, anchor);
  if (!located) return null;

  const matchStart = located.start;
  const matchEnd = located.end;

  // Map the [matchStart, matchEnd) range in the full text back to the
  // underlying text nodes and their local offsets.
  const commentAnchorNodes: CommentAnchorNode[] = [];
  for (const entry of textNodes) {
    const nodeStart = entry.offset;
    const nodeEnd = entry.offset + entry.length;

    // Skip nodes entirely before the match.
    if (nodeEnd <= matchStart) continue;
    // Stop once we've passed the match.
    if (nodeStart >= matchEnd) break;

    const localStart = Math.max(0, matchStart - nodeStart);
    const localEnd = Math.min(entry.length, matchEnd - nodeStart);

    if (localStart < localEnd) {
      commentAnchorNodes.push({
        node: entry.node,
        startOffset: localStart,
        endOffset: localEnd
      });
    }
  }

  if (commentAnchorNodes.length === 0) return null;

  return { nodes: commentAnchorNodes };
}

export function locateComment(
  doc: string,
  anchor: Anchor,
  /** `fuzzy: false` stops after the exact match, to try another text first. */
  { fuzzy = true }: { fuzzy?: boolean } = {}
): LocatedAnchor | null {
  const { selection, prefix = "", suffix = "", maxEdits } = anchor;

  /* Guard: empty selection cannot be located */
  if (!selection || selection.length === 0) {
    return null;
  }

  // 1. Find ALL exact occurrences of the anchor string
  const positions: number[] = [];
  let idx = doc.indexOf(selection);
  while (idx !== -1) {
    positions.push(idx);
    idx = doc.indexOf(selection, idx + 1);
  }

  /* Exactly 1 match → return it with max score */
  if (positions.length === 1) {
    const pos = positions[0];
    return { start: pos, end: pos + selection.length, score: 1 };
  }

  if (positions.length > 1) {
    // 2. Break ties via prefix / suffix similarity
    const scored: Array<{ pos: number; score: number }> = positions.map(
      (pos) => {
        /* Slice doc around this occurrence with the same context length   */
        const preSlice = doc.slice(Math.max(0, pos - prefix.length), pos);
        const sufSlice = doc.slice(
          pos + selection.length,
          pos + selection.length + suffix.length
        );

        const preSim = similarity(prefix, preSlice);
        const sufSim = similarity(suffix, sufSlice);

        /* Weight by context length so longer context has more influence   */
        const score =
          (preSim * prefix.length + sufSim * suffix.length) /
          (prefix.length + suffix.length || 1); // avoid /0

        return { pos, score };
      }
    );

    scored.sort((a, b) => b.score - a.score);

    /* Always take the best one – even if similarity is low. */
    const best = scored[0];
    return {
      start: best.pos,
      end: best.pos + selection.length,
      score: best.score
    };
  }

  if (!fuzzy) return null;

  // 3. No exact anchor match → fuzzy match full context (pre+anchor+post)
  let context = selection;
  let prefixOffset = 0;
  if (context.length < dmp.Match_MaxBits) {
    context = `${prefix}${selection}`;
    prefixOffset = prefix.length;
  }
  if (context.length < dmp.Match_MaxBits)
    context = `${prefix}${selection}${suffix}`;
  // NB: context.length must be at most Match_MaxBits = 32 in most browsers
  context = context.substring(0, dmp.Match_MaxBits - 1);

  if (context) {
    const threshold =
      maxEdits !== undefined
        ? maxEdits / context.length
        : Math.min(0.35, 6 / context.length);

    dmp.Match_Distance = doc.length * 10;
    dmp.Match_Threshold = threshold;

    const pos = dmp.match_main(doc, context, Math.floor(doc.length / 2));
    if (pos !== -1) {
      const edits = dmp.diff_levenshtein(
        dmp.diff_main(context, doc.slice(pos, pos + context.length))
      );
      const goodness = 1 - edits / context.length;

      if (goodness >= 1 - threshold) {
        /* Anchor start is offset by prefix length inside the match        */
        return {
          start: pos + prefixOffset,
          end: pos + prefixOffset + selection.length,
          score: goodness
        };
      }
    }
  }

  // 4. Give up → caller will render thread outside the publication.
  return null;
}
