// "unist-util-to-string-with-nodes" ships no types of its own (no bundled
// .d.ts, no @types package), so without this ambient declaration every
// import of it resolves to `any` and TS reports
// "Could not find a declaration file for module ...". Used by
// app/lib/markdown.ts.
//
// Shape below is transcribed from the package's actual source
// (node_modules/unist-util-to-string-with-nodes/index.js) and README, not
// guessed from call sites: it walks a unist tree and returns the
// concatenated text plus one CharacterNode per character in that text
// (used elsewhere to map an offset in the text back to its source line/
// column/position in the original tree).
declare module "unist-util-to-string-with-nodes" {
  import type { Node } from "unist";

  interface CharacterNode {
    value: string;
    line: number;
    column: number;
    offset: number;
  }

  export default function toString(tree: Node): {
    text: string;
    nodes: CharacterNode[];
  };
}
