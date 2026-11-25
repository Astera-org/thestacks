import { LoadingSpinner } from "@/components/LoadingSpinner";
import Chip from "@/components/stacks-ui/Chip";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverTrigger,
} from "@/components/stacks-ui/Popover";
import TokenField, {
  Token,
  TokenAddButton,
  TokenFieldPlaceholder,
} from "@/components/stacks-ui/TokenField";
import {
  ContributorAffiliationV1,
  OrganizationV1,
  OrgOnPubV1,
} from "@/types/v1";
import { useState } from "react";
import {
  PickerHeader,
  pickerItemClass,
  PickerSearch,
  PickerSectionLabel,
} from "./PickerParts";

function toAffiliation(org: OrganizationV1): ContributorAffiliationV1 {
  return {
    orgId: org.id,
    name: org.name,
    slug: org.slug,
    rorId: org.rorId,
    avatar: org.avatar,
  };
}

/**
 * A contributor's affiliations as removable tokens, plus a picker over the
 * candidate orgs to add another. A contributor can have any number of
 * affiliations, including none. With none set, the contributor is affiliated
 * with the pub's own orgs, which are shown as dashed default tokens.
 */
export default function ContribAffiliations({
  affiliations,
  candidateOrgs,
  contributorName,
  defaultOrgs,
  disabled,
  loading,
  locked,
  onChange,
}: {
  affiliations: ContributorAffiliationV1[];
  candidateOrgs: OrganizationV1[] | undefined;
  contributorName: string;
  /** Orgs a contributor with no explicit affiliation falls back to. */
  defaultOrgs?: OrgOnPubV1[];
  disabled?: boolean;
  loading?: boolean;
  locked?: boolean;
  onChange: (affiliations: ContributorAffiliationV1[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const affiliatedIds = new Set(affiliations.map((a) => a.orgId));
  const normalizedQuery = query.trim().toLowerCase();
  const options = (candidateOrgs ?? [])
    .filter((org) => !affiliatedIds.has(org.id))
    .filter((org) => org.name.toLowerCase().includes(normalizedQuery));
  const readOnly = disabled || locked;

  const close = () => {
    setOpen(false);
    setQuery("");
  };

  return (
    <Popover
      open={open && !readOnly}
      onOpenChange={(next) => (next ? setOpen(true) : close())}
    >
      <PopoverAnchor asChild>
        <TokenField
          aria-label={`Affiliations for ${contributorName}`}
          role="group"
          state={locked ? "locked" : open ? "active" : "default"}
        >
          {affiliations.map((affiliation) => (
            <Token
              key={affiliation.orgId}
              locked={locked}
              removeLabel={`Remove affiliation: ${affiliation.name}`}
              onRemove={
                readOnly
                  ? undefined
                  : () =>
                      onChange(
                        affiliations.filter(
                          (a) => a.orgId !== affiliation.orgId
                        )
                      )
              }
            >
              {affiliation.name}
            </Token>
          ))}
          {!readOnly && (
            <PopoverTrigger asChild>
              <TokenAddButton
                aria-label={`Add an affiliation for ${contributorName}`}
              />
            </PopoverTrigger>
          )}
          {affiliations.length === 0 &&
            (defaultOrgs?.length ? (
              defaultOrgs.map((org) => (
                <Token
                  key={org.orgId}
                  className="border-dashed shadow-none"
                  locked={locked}
                  suffix={
                    <Chip
                      className="text-caption-10 h-4 px-1.5 uppercase"
                      intent="muted"
                      size="xs"
                    >
                      Default
                    </Chip>
                  }
                >
                  {org.name}
                </Token>
              ))
            ) : (
              <TokenFieldPlaceholder>
                {readOnly ? "None" : "Select affiliations…"}
              </TokenFieldPlaceholder>
            ))}
        </TokenField>
      </PopoverAnchor>

      <PopoverContent
        align="start"
        aria-label={`Add an affiliation for ${contributorName}`}
        className="max-h-96 w-72 overflow-y-auto p-1.5"
        variant="light"
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          (e.currentTarget as HTMLElement)
            .querySelector<HTMLInputElement>("input[aria-label]")
            ?.focus();
        }}
      >
        <PickerHeader title="Add affiliation" />
        <PickerSearch
          label={`Search organizations for ${contributorName}`}
          placeholder="Search organizations…"
          value={query}
          onChange={setQuery}
        />

        {loading ? (
          <div className="flex justify-center py-4">
            <LoadingSpinner />
          </div>
        ) : options.length > 0 ? (
          <>
            <PickerSectionLabel>
              {normalizedQuery ? "Matches" : "Suggested"}
            </PickerSectionLabel>
            <ul aria-label="Organizations">
              {options.map((org) => (
                <li key={org.id}>
                  <button
                    className={pickerItemClass}
                    type="button"
                    onClick={() => {
                      onChange([...affiliations, toAffiliation(org)]);
                      close();
                    }}
                  >
                    {org.name}
                  </button>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <div className="text-body-20 text-fg-muted flex flex-col gap-1 px-2 py-2">
            {normalizedQuery ? (
              <p>
                No organization matches{" "}
                <span className="text-fg">“{query.trim()}”</span>.
              </p>
            ) : (
              <p>No organizations available.</p>
            )}
            <p>
              Affiliations come from the organizations linked to this pub and
              its contributors. Ask your org admin to add one.
            </p>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
