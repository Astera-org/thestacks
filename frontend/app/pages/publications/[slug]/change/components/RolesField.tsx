import Checkbox from "@/components/stacks-ui/Checkbox";
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
import { CONTRIBUTOR_ROLES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useMemo, useState } from "react";
import { PickerHeader, PickerSearch, pickerItemClass } from "./PickerParts";

export const LAST_ROLE_MESSAGE =
  "A contributor needs at least one role. Remove the contributor instead.";

export default function RolesField({
  contributorName,
  defaultOpen = false,
  disabled,
  locked,
  onChange,
  onOpenChange,
  requireRole,
  roles,
}: {
  contributorName: string;
  defaultOpen?: boolean;
  disabled?: boolean;
  locked?: boolean;
  onChange: (roles: string[]) => void;
  onOpenChange?: (open: boolean) => void;
  /**
   * Keep the last role from being removed. The backend stores one row per
   * role, so a contributor with no roles would be dropped on save.
   */
  requireRole?: boolean;
  roles: string[];
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [query, setQuery] = useState("");

  // The backend returns roles alphabetically; match it so tokens don't jump
  // when a save comes back.
  const sortedRoles = useMemo(
    () => [...roles].sort((a, b) => a.localeCompare(b)),
    [roles]
  );
  const isLastRole = (role: string) =>
    Boolean(requireRole) && roles.length === 1 && roles[0] === role;

  const toggle = (role: string) => {
    if (roles.includes(role)) {
      if (isLastRole(role)) return;
      onChange(roles.filter((r) => r !== role));
    } else {
      onChange([...roles, role]);
    }
  };

  const normalizedQuery = query.trim().toLowerCase();
  const visibleRoles = CONTRIBUTOR_ROLES.filter((role) =>
    role.toLowerCase().includes(normalizedQuery)
  );
  const readOnly = disabled || locked;

  return (
    <Popover
      open={open && !readOnly}
      onOpenChange={(next) => {
        setOpen(next);
        onOpenChange?.(next);
        if (!next) setQuery("");
      }}
    >
      <PopoverAnchor asChild>
        <TokenField
          aria-label={`CRediT roles for ${contributorName}`}
          role="group"
          state={locked ? "locked" : open ? "active" : "default"}
        >
          {sortedRoles.map((role) => (
            <Token
              key={role}
              locked={locked}
              removeLabel={`Remove role: ${role}`}
              title={isLastRole(role) ? LAST_ROLE_MESSAGE : undefined}
              onRemove={
                readOnly || isLastRole(role) ? undefined : () => toggle(role)
              }
            >
              {role}
            </Token>
          ))}
          {!readOnly && (
            <PopoverTrigger asChild>
              <TokenAddButton
                aria-label={`Add CRediT role for ${contributorName}`}
                className={cn(roles.length === 0 && "pr-0")}
              />
            </PopoverTrigger>
          )}
          {roles.length === 0 && (
            <TokenFieldPlaceholder>Select roles…</TokenFieldPlaceholder>
          )}
        </TokenField>
      </PopoverAnchor>

      <PopoverContent
        align="start"
        aria-label={`Add CRediT role for ${contributorName}`}
        className="max-h-96 w-64 overflow-y-auto p-1.5"
        variant="light"
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          (e.currentTarget as HTMLElement)
            .querySelector<HTMLInputElement>("input[aria-label]")
            ?.focus();
        }}
      >
        <PickerHeader
          meta={`${roles.length}/${CONTRIBUTOR_ROLES.length}`}
          title="Add CRediT role"
        />
        <PickerSearch
          label="Filter roles"
          placeholder="Filter roles…"
          value={query}
          onChange={setQuery}
        />
        <ul aria-label="CRediT roles">
          {visibleRoles.map((role) => {
            const checked = roles.includes(role);
            return (
              <li key={role}>
                <label
                  className={cn(
                    pickerItemClass,
                    "cursor-pointer",
                    checked && "text-fg-muted",
                    isLastRole(role) && "cursor-not-allowed"
                  )}
                  title={isLastRole(role) ? LAST_ROLE_MESSAGE : undefined}
                >
                  <Checkbox
                    checked={checked}
                    disabled={isLastRole(role)}
                    onChange={() => toggle(role)}
                  />
                  {role}
                </label>
              </li>
            );
          })}
        </ul>
        {visibleRoles.length === 0 && (
          <p className="text-body-20 text-fg-muted px-2 py-2">
            No role matches “{query.trim()}”.
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
}
