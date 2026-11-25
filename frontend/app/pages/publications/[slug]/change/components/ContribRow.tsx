import { CloseIcon } from "@/components/icons";
import Avatar from "@/components/stacks-ui/Avatar";
import Button from "@/components/stacks-ui/Button";
import IconButton from "@/components/stacks-ui/IconButton";
import { cn } from "@/lib/utils";
import { ContributorV1, OrganizationV1, OrgOnPubV1 } from "@/types/v1";
import { ChevronDown, ChevronUp, GripVertical } from "lucide-react";
import { DragEvent, useRef } from "react";
import BylineToggle from "./BylineToggle";
import ContribAffiliations from "./ContribAffiliations";
import { CONTRIBUTOR_GRID_COLS } from "./contributorGrid";
import RolesField from "./RolesField";

// Row actions stay quiet until the row is hovered or focused, and are always
// visible where hover does not exist.
const revealOnRowClass =
  "transition-opacity lg:can-hover:opacity-0 lg:group-focus-within:opacity-100 lg:group-hover:opacity-100";

export default function ContribRow({
  candidateOrgs,
  candidateOrgsLoading,
  contributor,
  defaultOrgs,
  disabled,
  enableDragAndDrop: _enableDragAndDrop,
  dropPosition,
  isDragging,
  onChange,
  onMoveDown,
  onMoveUp,
  onRemove,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: {
  candidateOrgs: OrganizationV1[] | undefined;
  candidateOrgsLoading?: boolean;
  contributor: ContributorV1;
  defaultOrgs?: OrgOnPubV1[];
  disabled?: boolean;
  enableDragAndDrop?: boolean;
  /** Where the dragged row would land relative to this row. */
  dropPosition: "before" | "after" | null;
  isDragging: boolean;
  onChange: (patch: Partial<ContributorV1>) => void;
  /** Undefined at the edges of the list. */
  onMoveDown?: () => void;
  onMoveUp?: () => void;
  onRemove: () => void;
  onDragStart: (e: DragEvent<HTMLDivElement>) => void;
  onDragOver: (e: DragEvent<HTMLDivElement>) => void;
  onDrop: (e: DragEvent<HTMLDivElement>) => void;
  onDragEnd: () => void;
}) {
  const enableDragAndDrop: undefined | true =
    (_enableDragAndDrop && !disabled) || undefined;
  const name = `${contributor.firstName} ${contributor.lastName}`;
  const moveUpRef = useRef<HTMLButtonElement>(null);
  const moveDownRef = useRef<HTMLButtonElement>(null);

  // Keep keyboard focus on the row after it moves, even when the pressed
  // button becomes disabled at the edge of the list.
  const move = (direction: "up" | "down") => {
    (direction === "up" ? onMoveUp : onMoveDown)?.();
    requestAnimationFrame(() => {
      const same = direction === "up" ? moveUpRef : moveDownRef;
      const other = direction === "up" ? moveDownRef : moveUpRef;
      const target = same.current?.disabled ? other.current : same.current;
      target?.focus();
    });
  };

  return (
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions -- TODO: native HTML5 drag-and-drop has no ARIA/keyboard equivalent; the only current keyboard-accessible reorder path is the list-level "Sort A-Z" button in ContributorsInline. Needs per-row move up/down controls for full keyboard parity.
    <div
      className={cn(
        "group border-border relative grid gap-x-3 gap-y-3 border-b px-5 py-5 transition-colors md:px-9 lg:items-center lg:gap-x-4 lg:py-4",
        CONTRIBUTOR_GRID_COLS,
        enableDragAndDrop &&
          (isDragging ? "cursor-grabbing opacity-40" : "cursor-grab")
      )}
      draggable={enableDragAndDrop}
      onDragEnd={enableDragAndDrop && onDragEnd}
      onDragOver={enableDragAndDrop && onDragOver}
      onDragStart={enableDragAndDrop && onDragStart}
      onDrop={enableDragAndDrop && onDrop}
    >
      {dropPosition && (
        <span
          aria-hidden
          className={cn(
            "bg-carbon-800 pointer-events-none absolute inset-x-0 z-10 h-1",
            dropPosition === "before" ? "top-0" : "bottom-0"
          )}
        />
      )}
      <span
        aria-hidden
        className="text-fg-subtle flex items-center self-center"
      >
        {enableDragAndDrop && <GripVertical className="size-4" />}
      </span>

      <div className="flex min-w-0 items-center gap-3">
        <Avatar
          alt={name}
          fallback={`${contributor.firstName[0] ?? ""}${contributor.lastName[0] ?? ""}`}
          iconColor={contributor.iconColor}
          src={contributor.avatar}
        />
        <div className="min-w-0">
          <div className="text-body-30 text-fg-strong truncate font-medium">
            {name}
          </div>
          {(contributor.orcid || contributor.username) && (
            <div className="text-caption-20 text-fg-muted mt-0.5 flex min-w-0 flex-wrap items-center gap-x-1">
              {contributor.orcid && (
                <a
                  className="hover:text-fg truncate transition-colors"
                  href={`https://orcid.org/${contributor.orcid}`}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  {contributor.orcid}
                </a>
              )}
              {contributor.orcid && contributor.username && (
                <span aria-hidden>·</span>
              )}
              {contributor.username && (
                <a
                  className="hover:text-fg truncate transition-colors"
                  href={`/users/${contributor.username}`}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  @{contributor.username}
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="col-start-2 min-w-0 lg:col-start-auto">
        <span
          aria-hidden
          className="text-caption-20 text-fg-muted mb-1.5 block font-mono lg:hidden"
        >
          Affiliations
        </span>
        <ContribAffiliations
          affiliations={contributor.affiliations ?? []}
          candidateOrgs={candidateOrgs}
          contributorName={name}
          defaultOrgs={defaultOrgs}
          disabled={disabled}
          loading={candidateOrgsLoading}
          onChange={(affiliations) => onChange({ affiliations })}
        />
      </div>

      <div className="col-start-2 min-w-0 lg:col-start-auto">
        <span
          aria-hidden
          className="text-caption-20 text-fg-muted mb-1.5 block font-mono lg:hidden"
        >
          CRediT roles
        </span>
        <RolesField
          contributorName={name}
          disabled={disabled}
          requireRole
          roles={contributor.roles}
          onChange={(roles) => onChange({ roles })}
        />
      </div>

      <div className="col-start-2 flex items-center gap-3 lg:col-start-auto lg:justify-center">
        <span
          aria-hidden
          className="text-caption-20 text-fg-muted font-mono lg:hidden"
        >
          Byline
        </span>
        <BylineToggle
          contributorName={name}
          disabled={disabled}
          on={contributor.inByline}
          onChange={(v) => onChange({ inByline: v })}
        />
      </div>

      <div
        className={cn(
          "col-start-2 flex items-center gap-1 lg:col-start-auto lg:justify-end",
          revealOnRowClass
        )}
      >
        {_enableDragAndDrop && (
          <>
            <IconButton
              ref={moveUpRef}
              aria-label={`Move ${name} up`}
              disabled={disabled || !onMoveUp}
              icon={<ChevronUp aria-hidden className="size-4" />}
              intent="ghost"
              size="xs"
              onClick={() => move("up")}
            />
            <IconButton
              ref={moveDownRef}
              aria-label={`Move ${name} down`}
              disabled={disabled || !onMoveDown}
              icon={<ChevronDown aria-hidden className="size-4" />}
              intent="ghost"
              size="xs"
              onClick={() => move("down")}
            />
          </>
        )}
        <Button
          aria-label={`Remove ${name}`}
          className="ml-2 lg:hidden"
          disabled={disabled}
          intent="outline"
          size="sm"
          onClick={onRemove}
        >
          Remove
        </Button>
        <IconButton
          aria-label={`Remove ${name}`}
          className="hidden lg:inline-flex"
          disabled={disabled}
          icon={<CloseIcon aria-hidden className="size-4" />}
          intent="ghost"
          size="xs"
          onClick={onRemove}
        />
      </div>
    </div>
  );
}
