import { issueMessages, ValidationIssue } from "@/api/errors";
import { AddIcon, CloseIcon } from "@/components/icons";
import Button from "@/components/stacks-ui/Button";
import IconButton from "@/components/stacks-ui/IconButton";
import Select from "@/components/stacks-ui/Select";
import { Commit } from "@/hooks/use-edit-publication/types";
import { LinkedAssetTypeV1, LinkedAssetV1 } from "@/types/v1";
import { Link2 } from "lucide-react";
import { useState } from "react";
import { z } from "zod";
import GenericInput from "./GenericInput";

const urlSchema = z.url();

type Row = { id: number; asset: LinkedAssetV1 };

// Row keys only need to be unique for the life of the page, not stable across reloads.
let rowIdCounter = 0;
const nextRowId = () => rowIdCounter++;

function sameAsset(a: LinkedAssetV1, b: LinkedAssetV1): boolean {
  return (
    a.type === b.type && a.url === b.url && (a.name ?? "") === (b.name ?? "")
  );
}

/**
 * Maps incoming assets onto the existing rows so their order and ids survive.
 * The server sorts assets by type, so its order can't drive the list while
 * someone is typing in it. Exact matches keep their row; leftovers pair up
 * positionally (a server-normalized value keeps its row); extras get new rows.
 */
export function reconcileRows(
  rows: Row[],
  incoming: LinkedAssetV1[],
  nextId: () => number
): Row[] {
  const taken = new Set<number>();
  const matched = rows.map((row) => {
    const i = incoming.findIndex(
      (a, j) => !taken.has(j) && sameAsset(a, row.asset)
    );
    if (i < 0) return null;
    taken.add(i);
    return { ...row, asset: incoming[i] };
  });

  const result: Row[] = [];
  rows.forEach((row, k) => {
    const exact = matched[k];
    if (exact) {
      result.push(exact);
      return;
    }
    const j = incoming.findIndex((_, idx) => !taken.has(idx));
    if (j < 0) return;
    taken.add(j);
    result.push({ ...row, asset: incoming[j] });
  });
  incoming.forEach((asset, j) => {
    if (!taken.has(j)) result.push({ id: nextId(), asset });
  });
  return result;
}

export default function AdditionalAssets({
  assets,
  disabled,
  fieldErrors,
  onCommit,
}: {
  assets: LinkedAssetV1[];
  disabled?: boolean;
  fieldErrors: ValidationIssue[] | null;
  onCommit: Commit;
}) {
  const [rows, setRows] = useState<Row[]>(() =>
    assets.map((asset) => ({ id: nextRowId(), asset }))
  );
  const [syncedAssets, setSyncedAssets] = useState(assets);
  if (assets !== syncedAssets) {
    setSyncedAssets(assets);
    setRows(reconcileRows(rows, assets, nextRowId));
  }

  /**
   * The slot being composed. It carries its row id from the start so the
   * inputs keep focus when it joins `rows` on the keystroke that completes it.
   */
  const [draft, setDraft] = useState<{
    id: number;
    asset: Partial<LinkedAssetV1>;
  } | null>(null);
  const [duplicates, setDuplicates] = useState<Set<number>>(new Set());

  // Rows stay local until every URL parses and no two rows collide: the
  // backend answers an invalid URL with 422 and a duplicate with 500, and
  // either would put the autosave into its retry loop.
  const commitRows = (next: Row[]) => {
    setRows(next);
    const seen = new Map<string, number>();
    const dupes = new Set<number>();
    for (const row of next) {
      const key = `${row.asset.type}:${row.asset.url}`;
      const first = seen.get(key);
      if (first !== undefined) dupes.add(first).add(row.id);
      else seen.set(key, row.id);
    }
    setDuplicates(dupes);
    const allValid = next.every(
      (r) => urlSchema.safeParse(r.asset.url).success
    );
    if (dupes.size === 0 && allValid) {
      onCommit<"linkedAssets">(
        "linkedAssets",
        next.map((r) => r.asset)
      );
    }
  };

  const updateRow = (id: number, patch: Partial<LinkedAssetV1>) =>
    commitRows(
      rows.map((r) =>
        r.id === id ? { ...r, asset: { ...r.asset, ...patch } } : r
      )
    );

  const removeRow = (id: number) => commitRows(rows.filter((r) => r.id !== id));

  const updateDraft = (patch: Partial<LinkedAssetV1>) => {
    if (!draft) return;
    const next = { ...draft.asset, ...patch };
    if (next.type && next.url) {
      commitRows([...rows, { id: draft.id, asset: next as LinkedAssetV1 }]);
      setDraft(null);
      return;
    }
    setDraft({ id: draft.id, asset: next });
  };

  const slots: { id: number; asset: Partial<LinkedAssetV1> }[] = [
    ...rows,
    ...(draft ? [draft] : []),
  ];

  return (
    <div className="flex w-full flex-col gap-3">
      {slots.map(({ id, asset }, i) => {
        const isDraft = draft?.id === id;
        const update = (patch: Partial<LinkedAssetV1>) =>
          isDraft ? updateDraft(patch) : updateRow(id, patch);
        return (
          <div
            key={id}
            className="flex flex-col gap-2 md:flex-row md:items-start"
          >
            <div className="md:w-44 md:shrink-0">
              <Select
                aria-label={`Asset ${i + 1} type`}
                disabled={disabled}
                options={Object.values(LinkedAssetTypeV1).map((laType) => ({
                  value: laType,
                  label: laType,
                }))}
                placeholder="Type…"
                value={asset.type}
                onValueChange={(t) => update({ type: t })}
              />
            </div>
            <div className="min-w-0 flex-1">
              <GenericInput
                aria-label={`Asset ${i + 1} URL`}
                disabled={disabled}
                error={[
                  ...(!isDraft && duplicates.has(id)
                    ? [`Duplicate asset: ${asset.type} ${asset.url}`]
                    : []),
                  ...issueMessages(fieldErrors, ["linked_assets", i, "url"]),
                ]}
                iconLeft={{ Icon: Link2 }}
                placeholder="URL"
                validation={(v) =>
                  urlSchema.safeParse(v).success ? null : "Invalid URL"
                }
                value={asset.url ?? ""}
                onChangeValue={(v) => update({ url: v })}
              />
            </div>
            <div className="md:w-48 md:shrink-0">
              <GenericInput
                aria-label={`Asset ${i + 1} name`}
                disabled={disabled}
                error={issueMessages(fieldErrors, ["linked_assets", i, "name"])}
                placeholder="Name (optional)"
                value={asset.name ?? ""}
                onChangeValue={(v) => update({ name: v })}
              />
            </div>
            <IconButton
              aria-label={`Remove asset ${i + 1}`}
              className="self-end md:mt-2.5 md:self-start"
              disabled={disabled}
              icon={<CloseIcon aria-hidden className="size-4" />}
              intent="ghost"
              size="sm"
              onClick={() => (isDraft ? setDraft(null) : removeRow(id))}
            />
          </div>
        );
      })}
      {!draft && (
        <Button
          className="gap-3"
          disabled={disabled}
          intent="outline"
          onClick={() => setDraft({ id: nextRowId(), asset: {} })}
        >
          <AddIcon aria-hidden className="size-2.5" />
          <span aria-hidden className="bg-border h-4 w-px" />
          Add asset
        </Button>
      )}
    </div>
  );
}
