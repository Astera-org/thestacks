import { CloseIcon } from "@/components/icons";
import IconButton from "@/components/stacks-ui/IconButton";
import { UserSelect, UserSelectHandle } from "@/components/UserSelect";

import { searchUsers } from "@/apiv1/users";
import { cn } from "@/lib/utils";
import { ContributorV1, LimitedUserV1 } from "@/types/v1";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import BylineToggle from "./BylineToggle";
import { CONTRIBUTOR_GRID_COLS } from "./contributorGrid";
import FieldError from "./FieldError";
import RolesField from "./RolesField";

const SELECTED_USER_BUTTON_CLASS_NAME =
  "border-carbon-200 hover:border-gray-blue-900 bg-surface flex min-h-12 w-full min-w-0 cursor-pointer items-center gap-3 overflow-hidden rounded-lg border p-1.5 transition-colors";

export type AddContribRowHandle = {
  focus: () => void;
};

export const AddContribRow = forwardRef<
  AddContribRowHandle,
  {
    disabled?: boolean;
    error?: string;
    isSubmitting?: boolean;
    onAdd: (payload: Omit<ContributorV1, "priority">) => void;
    onRemove: () => void;
  }
>(({ disabled, error, isSubmitting, onAdd, onRemove }, ref) => {
  const inputRef = useRef<UserSelectHandle>(null);
  const [inByline, setInByline] = useState<boolean>(false);
  const [roles, setRoles] = useState<string[]>([]);
  // The picker opens as soon as a person is picked; the row is only saved
  // once it closes, so several roles can be chosen in one go.
  const [rolesOpen, setRolesOpen] = useState(true);
  const [selectedUser, setSelectedUser] = useState<LimitedUserV1 | null>(null);

  // Tracks the last (user, roles, byline) combo already submitted, so a
  // failed attempt doesn't loop forever once `isSubmitting` flips back to
  // false — the effect only re-fires once the user actually changes
  // something. The "Try again" button re-submits the same combo explicitly.
  const lastAttemptKey = useRef<string | null>(null);
  const attemptKey = selectedUser
    ? `${selectedUser.id}:${roles.join(",")}:${inByline}`
    : null;

  const submit = useCallback(() => {
    if (roles.length === 0 || !selectedUser) return;
    lastAttemptKey.current = attemptKey;
    onAdd({
      userId: selectedUser.id,
      orcid: selectedUser.orcid,
      avatar: selectedUser.avatar ?? undefined,
      firstName: selectedUser.firstName,
      lastName: selectedUser.lastName,
      iconColor: selectedUser.iconColor,
      username: selectedUser.username,
      roles,
      inByline,
    });
  }, [onAdd, inByline, roles, selectedUser, attemptKey]);

  useEffect(() => {
    if (
      roles.length > 0 &&
      selectedUser &&
      !rolesOpen &&
      !isSubmitting &&
      lastAttemptKey.current !== attemptKey
    ) {
      submit();
    }
  }, [roles, rolesOpen, selectedUser, isSubmitting, attemptKey, submit]);

  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus(),
  }));

  return (
    <div className="border-border border-b">
      <div
        className={cn(
          "grid gap-x-3 gap-y-3 px-5 py-5 md:px-9 lg:items-center lg:gap-x-4 lg:py-4",
          CONTRIBUTOR_GRID_COLS
        )}
      >
        <span />
        <div className="min-w-0">
          <UserSelect
            ref={inputRef}
            className="w-full min-w-0"
            disabled={disabled}
            inputClassName="text-body-30 md:text-body-20 placeholder:text-carbon-400"
            inputContainerClassName="h-11 rounded-lg border-gray-blue-900/10 bg-gray-200 hover:border-gray-blue-900/35 focus-within:border-gray-blue-900/35"
            searchFunction={async (value) => (await searchUsers(value))?.items}
            selectedButtonClassName={SELECTED_USER_BUTTON_CLASS_NAME}
            onSelect={(user) => {
              setSelectedUser(user);
              setRolesOpen(true);
            }}
          />
        </div>
        <p className="text-caption-20 text-fg-muted col-start-2 lg:col-start-auto">
          Affiliations can be added once the contributor is saved.
        </p>
        <div className="col-start-2 min-w-0 lg:col-start-auto">
          {selectedUser ? (
            <RolesField
              key={selectedUser.id}
              contributorName={`${selectedUser.firstName} ${selectedUser.lastName}`}
              defaultOpen={roles.length === 0}
              disabled={disabled}
              roles={roles}
              onChange={setRoles}
              onOpenChange={setRolesOpen}
            />
          ) : (
            <span className="text-caption-20 text-fg-muted">
              Pick a person, then their roles.
            </span>
          )}
        </div>
        <div className="col-start-2 flex lg:col-start-auto lg:justify-center">
          <BylineToggle
            contributorName={
              selectedUser
                ? `${selectedUser.firstName} ${selectedUser.lastName}`
                : "the new contributor"
            }
            disabled={disabled}
            on={inByline}
            onChange={setInByline}
          />
        </div>
        <div className="col-start-2 lg:col-start-auto">
          <IconButton
            aria-label="Cancel adding contributor"
            disabled={disabled}
            icon={<CloseIcon aria-hidden className="size-4" />}
            intent="ghost"
            size="xs"
            onClick={onRemove}
          />
        </div>
      </div>
      {error && (
        <div className="px-5 pb-4 md:px-9">
          <FieldError announce message={error} />
        </div>
      )}
    </div>
  );
});

export default AddContribRow;
