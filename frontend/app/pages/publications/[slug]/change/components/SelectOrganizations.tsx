import { LoadingSpinner } from "@/components/LoadingSpinner";
import { AddIcon, CloseIcon } from "@/components/icons";
import Button from "@/components/stacks-ui/Button";
import IconButton from "@/components/stacks-ui/IconButton";
import Select from "@/components/stacks-ui/Select";
import {
  Commit,
  EditPublicationStatus,
} from "@/hooks/use-edit-publication/types";
import { organizationToOrgOnPub } from "@/lib/utils/organizationToOrgOnPub";
import { OrganizationV1, OrgOnPubV1, PublicationV1 } from "@/types/v1";
import { useEffect, useMemo, useState } from "react";
import { useCandidateOrgs } from "../useCandidateOrgs";
import FieldError from "./FieldError";

type PublicationOrg = NonNullable<PublicationV1["orgs"]>[number];

export function SelectOrganizations({
  disabled,
  onCommit,
  publication,
  status,
}: {
  disabled?: boolean;
  onCommit: Commit;
  publication: PublicationV1;
  status: EditPublicationStatus;
}) {
  const { data: orgsAvailableForPub, isPending } = useCandidateOrgs(
    publication,
    status
  );

  const orgsAvailableMap = useMemo(() => {
    return Object.fromEntries(
      orgsAvailableForPub?.items?.map((o) => [o.id, o]) ?? []
    );
  }, [orgsAvailableForPub]);

  // True while an extra, not-yet-selected dropdown is showing (user clicked
  // "Add Organization" but hasn't picked a value yet).
  const [addingSlot, setAddingSlot] = useState(false);
  // Holds the org the user just picked for the empty slot, until `orgs`
  // (server/cache truth) actually contains it. Lets us render it in place
  // immediately instead of removing the slot and waiting for it to reappear.
  const [pendingOrg, setPendingOrg] = useState<PublicationOrg | null>(null);

  const orgs = publication?.orgs ?? [];

  useEffect(() => {
    if (
      pendingOrg &&
      publication?.orgs?.some((o) => o.orgId === pendingOrg.orgId)
    ) {
      // This should be safe
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPendingOrg(null);
      setAddingSlot(false);
    }
  }, [publication?.orgs, pendingOrg, setPendingOrg, setAddingSlot]);

  // What to render: every saved org, plus a trailing empty slot if we're
  // adding one. If there are no saved orgs yet, always show a single empty
  // slot since every publication needs at least one organization.
  const slots: (PublicationOrg | null)[] =
    orgs.length === 0
      ? [pendingOrg]
      : [...orgs, ...(addingSlot ? [pendingOrg] : [])];

  const lastSlot = slots[slots.length - 1];
  const showAddButton = lastSlot !== null;
  const showRemoveButton = orgs.length >= 2;

  const shouldUsePriority = orgs.map((o) => o.priority != null).every((p) => p);

  const handleSelect = (
    previousValue: OrgOnPubV1 | null,
    selectedOrg: OrganizationV1,
    index: number
  ) => {
    const priority = index;

    const selectedOrgToPub = organizationToOrgOnPub(
      selectedOrg,
      shouldUsePriority ? priority : undefined
    );

    if (previousValue == null) {
      setPendingOrg(selectedOrgToPub);
      onCommit({ orgs: [...orgs, selectedOrgToPub] });
    } else {
      onCommit({
        orgs: [
          ...orgs.slice(0, index),
          selectedOrgToPub,
          ...orgs.slice(index + 1),
        ],
      });
    }
  };

  const handleRemove = (orgId: string | undefined | null) => {
    if (orgId == null) {
      setAddingSlot(false);
      return;
    }

    onCommit({
      orgs: orgs.filter((o) => o.orgId !== orgId),
    });
  };

  return (
    <div className="flex flex-col gap-2">
      {slots.map((slot, index) => {
        const selectedElsewhere = new Set(
          slots
            .filter((_, i) => i !== index)
            .map((s) => s?.orgId)
            .filter(Boolean)
        );

        const isPendingSlot = index >= orgs.length;

        return (
          <div key={index} className="flex items-center gap-2">
            {!orgsAvailableForPub ? (
              isPending ? (
                <div className="border-border-strong text-body-20 text-fg-muted flex h-13 w-full items-center gap-3 rounded-lg border px-4">
                  <LoadingSpinner />
                  Loading organizations…
                </div>
              ) : (
                <FieldError
                  announce
                  message="Couldn't load organizations. Please try again."
                />
              )
            ) : (
              <Select
                aria-label={
                  index === 0 ? "Community" : `Community ${index + 1}`
                }
                disabled={disabled}
                options={orgsAvailableForPub.items.map((o) => ({
                  value: String(o.id),
                  label: o.name,
                  disabled: selectedElsewhere.has(o.id),
                }))}
                placeholder="Select a community"
                value={slot ? String(slot.orgId) : undefined}
                onValueChange={(v) =>
                  handleSelect(slot, orgsAvailableMap[v], index)
                }
              />
            )}

            {showRemoveButton && !isPendingSlot && (
              <IconButton
                aria-label={`Remove ${slot?.name} from the publication`}
                disabled={disabled}
                icon={<CloseIcon aria-hidden className="size-4" />}
                intent="ghost"
                size="sm"
                onClick={() => handleRemove(slot?.orgId)}
              />
            )}

            {isPendingSlot && orgs.length > 0 && (
              <IconButton
                aria-label="Cancel adding a community"
                disabled={disabled}
                icon={<CloseIcon aria-hidden className="size-4" />}
                intent="ghost"
                size="sm"
                onClick={() => {
                  setAddingSlot(false);
                  setPendingOrg(null);
                }}
              />
            )}
          </div>
        );
      })}

      {showAddButton &&
        slots.length < (orgsAvailableForPub?.items?.length ?? 0) && (
          <Button
            className="gap-2"
            disabled={disabled}
            intent="outline"
            size="sm"
            onClick={() => setAddingSlot(true)}
          >
            <AddIcon aria-hidden className="size-2.5" />
            Add another community
          </Button>
        )}
    </div>
  );
}
