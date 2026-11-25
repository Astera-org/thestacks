import type { GenericNode } from "myst-common";
import { MyST } from "myst-to-react";

/**
 * The table edge classes the Google Docs renderer adds
 * (rehypeTableEdgeCells), which prose.css draws the outer rules with.
 */
function edgeClasses(
  rowIndex: number,
  rowCount: number,
  cellIndex: number,
  cellCount: number
): string | undefined {
  const classes = [
    rowIndex === 0 && "table-edge-top",
    rowIndex === rowCount - 1 && "table-edge-bottom",
    cellIndex === 0 && "table-edge-left",
    cellIndex === cellCount - 1 && "table-edge-right"
  ].filter(Boolean);
  return classes.length ? classes.join(" ") : undefined;
}

const ALIGNMENTS = new Set(["left", "center", "right"]);

/** The column alignment from `---:` / `:---:` in a Markdown table. */
function cellAlign(cell: GenericNode): "left" | "center" | "right" | undefined {
  return typeof cell.align === "string" && ALIGNMENTS.has(cell.align)
    ? (cell.align as "left" | "center" | "right")
    : undefined;
}

function Row({
  row,
  rowIndex,
  rowCount
}: {
  row: GenericNode;
  rowIndex: number;
  rowCount: number;
}) {
  const cells: GenericNode[] = row.children ?? [];
  return (
    <tr>
      {cells.map((cell, cellIndex) => {
        const Cell = cell.header ? "th" : "td";
        const align = cellAlign(cell);
        return (
          <Cell
            key={cell.key}
            className={edgeClasses(rowIndex, rowCount, cellIndex, cells.length)}
            colSpan={
              typeof cell.colspan === "number" ? cell.colspan : undefined
            }
            rowSpan={
              typeof cell.rowspan === "number" ? cell.rowspan : undefined
            }
            style={align && { textAlign: align }}
          >
            <MyST ast={cell.children} />
          </Cell>
        );
      })}
    </tr>
  );
}

/** Leading rows made only of header cells become the `thead`. */
function Table({ node }: { node: GenericNode }) {
  const rows: GenericNode[] = node.children ?? [];
  const headerCount = rows.findIndex(
    (row) => !(row.children ?? []).every((cell: GenericNode) => cell.header)
  );
  const split = headerCount === -1 ? rows.length : headerCount;
  const renderRows = (slice: GenericNode[], offset: number) =>
    slice.map((row, i) => (
      <Row
        key={row.key}
        row={row}
        rowCount={rows.length}
        rowIndex={offset + i}
      />
    ));
  return (
    <div
      className="table-scroll-wrapper"
      id={typeof node.html_id === "string" ? node.html_id : undefined}
    >
      <table>
        {split > 0 && <thead>{renderRows(rows.slice(0, split), 0)}</thead>}
        {split < rows.length && (
          <tbody>{renderRows(rows.slice(split), split)}</tbody>
        )}
      </table>
    </div>
  );
}

export const TABLE_RENDERERS = { table: Table };
