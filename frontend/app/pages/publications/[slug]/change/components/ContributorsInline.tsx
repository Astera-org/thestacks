import { namespaceIssueMessage, ValidationIssue } from "@/api/errors";
import { Commit, CommitId } from "@/hooks/use-edit-publication/types";

import { AddIcon } from "@/components/icons";
import Button from "@/components/stacks-ui/Button";
import { cn } from "@/lib/utils";
import { ContributorV1, OrganizationV1, OrgOnPubV1 } from "@/types/v1";
import { Info } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import AddContribRow, { AddContribRowHandle } from "./AddContribRow";
import ContribRow from "./ContribRow";
import { CONTRIBUTOR_GRID_COLS } from "./contributorGrid";

import FieldError from "./FieldError";

function alphebetizeContributors(
  contributors: ContributorV1[]
): ContributorV1[] {
  // Spread contributors into new array so you don't modify the original
  const sorted = [...contributors].sort(
    (a, b) =>
      a.lastName.toLowerCase().localeCompare(b.lastName.toLowerCase()) ||
      // If last names are equal (compare === 0) the or is triggered, and we compare first names
      a.firstName.toLowerCase().localeCompare(b.firstName.toLowerCase())
  );

  return sorted.map((c, i) => ({ ...c, priority: i + 1 }));
}

export default function ContributorsInline({
  candidateOrgs,
  candidateOrgsLoading,
  contributors: unsortedContributors,
  disabled,
  fieldErrors,
  onCommit,
  pubOrgs,
}: {
  candidateOrgs: OrganizationV1[] | undefined;
  candidateOrgsLoading?: boolean;
  contributors: ContributorV1[];
  disabled?: boolean;
  fieldErrors: ValidationIssue[] | null;
  onCommit: Commit;
  pubOrgs?: OrgOnPubV1[];
}) {
  const [showAddContributor, setShowAddContributor] = useState<boolean>(false);
  const [dragRowIdx, setDragRowIdx] = useState<number | null>(null);
  const [overRowIdx, setOverRowIdx] = useState<number | null>(null);

  const [contributorsOrder, setContributorsOrder] = useState<string[]>([]);
  const [contributorsIdMap, setContributorsIdMap] = useState<
    Record<string, ContributorV1>
  >({});
  const [addingCommit, setAddingCommit] = useState<CommitId | null>(null);
  const [addContribError, setAddContribError] = useState<string | undefined>(
    undefined
  );

  const addContribRef = useRef<AddContribRowHandle>(null);

  useEffect(() => {
    // Cannot cause a loop as it only depends on the outside prop
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setContributorsIdMap((cIdMap) => {
      const backwardsMap = Object.fromEntries(
        Object.entries(cIdMap).map(([key, c]) => [c.userId.toString(), key])
      );
      const idMap = unsortedContributors.reduce<Record<string, ContributorV1>>(
        (map, contrib) => {
          const id = contrib.userId.toString();
          const key = backwardsMap[id] ?? id;
          return { ...map, [key]: contrib };
        },
        {}
      );
      return idMap;
    });
  }, [unsortedContributors]);

  useEffect(() => {
    // Cannot cause a loop as no effects rely on ontributorsOrder
    const order = Object.entries(contributorsIdMap).sort(
      ([_, a], [__, b]) => (a.priority ?? 99999) - (b.priority ?? 99999)
    );
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setContributorsOrder(order.map(([key]) => key));
  }, [contributorsIdMap]);

  const enableDragAndDrop = unsortedContributors?.length > 1;

  const handleAddRow = useCallback(() => {
    setShowAddContributor(true);
    setTimeout(() => {
      addContribRef.current?.focus();
    }, 0);
  }, [setShowAddContributor]);

  const handleSortAz = () => {
    onCommit({ contributors: alphebetizeContributors(unsortedContributors) });
  };

  const sortedContributors = contributorsOrder.map(
    (id) => contributorsIdMap[id]
  );

  const moveContributor = (from: number, to: number) => {
    const next = sortedContributors.filter(Boolean);
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onCommit({
      contributors: next.map((c, i) => ({ ...c, priority: i + 1 })),
    });
  };

  return (
    <div className="-mx-5 md:-mx-9">
      <div
        aria-hidden
        className={cn(
          "text-caption-30 text-fg border-border hidden gap-4 border-y bg-gray-200 px-9 py-2.5 font-mono lg:grid",
          CONTRIBUTOR_GRID_COLS
        )}
      >
        <span />
        <span>Person</span>
        <span>Affiliation</span>
        <span>CRediT roles</span>
        <span className="text-center">Byline</span>
        <span />
      </div>

      <div className="border-border border-t lg:border-t-0">
        {contributorsOrder.length === 0 && !showAddContributor && (
          <p className="text-body-30 text-fg-muted border-border border-b px-5 py-6 text-center md:px-9">
            No contributors added yet.
          </p>
        )}
        {contributorsOrder.map((contributorId, displayIndexOnly) => {
          const contributor = contributorsIdMap[contributorId];
          if (!contributor) return null;
          return (
            <ContribRow
              key={contributorId}
              candidateOrgs={candidateOrgs}
              candidateOrgsLoading={candidateOrgsLoading}
              contributor={contributor}
              defaultOrgs={pubOrgs}
              disabled={disabled}
              dropPosition={
                overRowIdx === displayIndexOnly &&
                dragRowIdx !== null &&
                dragRowIdx !== displayIndexOnly
                  ? dragRowIdx < displayIndexOnly
                    ? "after"
                    : "before"
                  : null
              }
              enableDragAndDrop={enableDragAndDrop}
              isDragging={dragRowIdx === displayIndexOnly}
              onChange={(patch) => {
                const newContribs = [...sortedContributors];
                const index = newContribs.findIndex(
                  (c) => c.userId === contributor.userId
                );
                if (index >= 0) {
                  const newContrib = { ...contributor, ...patch };
                  if (newContrib.roles.length > 0) {
                    newContribs[index] = newContrib;
                  } else {
                    newContribs.splice(index, 1);
                  }
                  onCommit({ contributors: newContribs });
                }
              }}
              onDragEnd={() => {
                setDragRowIdx(null);
                setOverRowIdx(null);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                if (dragRowIdx !== displayIndexOnly)
                  setOverRowIdx(displayIndexOnly);
              }}
              onDragStart={(e) => {
                setDragRowIdx(displayIndexOnly);
                e.dataTransfer.effectAllowed = "move";
              }}
              onDrop={() => {
                if (dragRowIdx === null || dragRowIdx === displayIndexOnly) {
                  setDragRowIdx(null);
                  setOverRowIdx(null);
                  return;
                }

                moveContributor(dragRowIdx, displayIndexOnly);
                setDragRowIdx(null);
                setOverRowIdx(null);
              }}
              onMoveDown={
                displayIndexOnly < contributorsOrder.length - 1
                  ? () =>
                      moveContributor(displayIndexOnly, displayIndexOnly + 1)
                  : undefined
              }
              onMoveUp={
                displayIndexOnly > 0
                  ? () =>
                      moveContributor(displayIndexOnly, displayIndexOnly - 1)
                  : undefined
              }
              onRemove={() => {
                const newContribs = [...sortedContributors];
                const index = newContribs.findIndex(
                  (c) => c.userId === contributor.userId
                );
                if (index >= 0) {
                  newContribs.splice(index, 1);
                  onCommit({
                    contributors: newContribs,
                  });
                }
              }}
            />
          );
        })}
        {showAddContributor && !addingCommit && (
          <AddContribRow
            ref={addContribRef}
            disabled={disabled}
            error={addContribError}
            isSubmitting={addingCommit !== null}
            onAdd={async (c) => {
              const newContrib: ContributorV1 = {
                ...c,
                priority:
                  Object.values(contributorsIdMap).reduce(
                    (max, c) => Math.max(max, c.priority),
                    0
                  ) + 1,
                affiliations: [],
              };
              const { id, result } = onCommit({
                contributors: [...sortedContributors, newContrib],
              });
              setAddingCommit(id);
              const res = await result;

              const outcome = res.outcomes.contributors;
              if (
                outcome === "applied" ||
                outcome === "superseded" ||
                outcome === "no-op"
              ) {
                setShowAddContributor(false);
                setAddingCommit(null);
                setAddContribError(undefined);
              }
              if (res.errors?.contributors) {
                setAddContribError(res.errors.contributors.message);
              }
            }}
            onRemove={() => {
              setShowAddContributor(false);
            }}
          />
        )}
      </div>

      <div className="border-border flex flex-col gap-3 border-b bg-gray-200 px-5 py-3 md:flex-row md:items-center md:justify-between md:gap-6 md:px-9">
        <p className="text-body-20 text-fg flex items-start gap-2.5">
          <Info aria-hidden className="text-fg-muted mt-0.5 size-4 shrink-0" />
          <span>
            Assign CRediT roles and, optionally, affiliations. The byline toggle
            marks the contributors who signed off on the publication. Authors
            are affiliated with the hosting organization when no affiliation is
            set.
          </span>
        </p>
        <div className="flex shrink-0 gap-2">
          {unsortedContributors.length > 1 && (
            <Button
              disabled={disabled}
              intent="outline"
              size="sm"
              title="Reorder by last name"
              onClick={handleSortAz}
            >
              Sort A–Z
            </Button>
          )}
          <Button
            className="gap-2"
            disabled={disabled || showAddContributor}
            intent="outline"
            size="sm"
            onClick={handleAddRow}
          >
            <AddIcon aria-hidden className="size-2.5" />
            Add contributor
          </Button>
        </div>
      </div>
      <div className="px-5 pt-2 md:px-9">
        <FieldError
          message={namespaceIssueMessage(fieldErrors, "contributors")}
        />
      </div>
    </div>
  );
}
