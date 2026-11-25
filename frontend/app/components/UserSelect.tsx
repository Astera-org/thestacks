import { cn } from "@/lib/utils";
import { LimitedUser } from "@/types";
import { LimitedUserV1 } from "@/types/v1";
import { useQuery } from "@tanstack/react-query";
import debounce from "lodash.debounce";
import { SearchIcon } from "lucide-react";
import {
  ComponentProps,
  InputHTMLAttributes,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState
} from "react";
import Combobox, { ComboboxHandle } from "./Combobox";
import OrcidLogo from "./icons/OrcidLogo";
import Avatar from "./stacks-ui/Avatar";

/**
 * The following functions allow this component to be used with both V0 and V1
 * code, by reducing the steps to extract variables that are potentially camel
 * or snake case to extraction functions.
 *
 * @todo remove once fully migrated from api-v0 to api-v1
 */
function isLimitedUserV1(
  user: LimitedUser | LimitedUserV1
): user is LimitedUserV1 {
  return typeof user.id === "string";
}

function getName(user: LimitedUser | LimitedUserV1): string {
  if (isLimitedUserV1(user)) {
    return `${user.firstName} ${user.lastName}`;
  }
  return `${user.first_name} ${user.last_name}`;
}

function getInitials(user: LimitedUser | LimitedUserV1): string {
  if (isLimitedUserV1(user)) {
    return `${user.firstName[0]}${user.lastName[0]}`;
  }
  return `${user.first_name[0]}${user.last_name[0]}`;
}

function getIconColor(user: LimitedUser | LimitedUserV1): string | undefined {
  if (isLimitedUserV1(user)) {
    return user.iconColor;
  }
  return user.icon_color;
}

function UserItem<TUser extends LimitedUser | LimitedUserV1>({
  allowLinks,
  isDark,
  user
}: {
  allowLinks?: boolean;
  isDark?: boolean;
  user: TUser;
}) {
  const orcidSpanClass =
    "flex items-center gap-1.5 underline decoration-transparent";
  const usernameSpanClass =
    "max-w-full overflow-hidden text-ellipsis underline decoration-transparent";
  const orcid = (
    <>
      <OrcidLogo className="size-3" />
      <span className="font-mono">{user.orcid}</span>
      <span className="opacity-30">·</span>
    </>
  );

  return (
    <div className="group/user flex w-full min-w-0 items-center gap-3 overflow-hidden">
      <Avatar
        alt={getName(user)}
        fallback={getInitials(user)}
        iconColor={getIconColor(user)}
        src={user.avatar}
      />
      <div className="max-w-full min-w-0">
        <div
          className={cn(
            allowLinks
              ? ""
              : isDark
                ? "group-hover/user:decoration-carbon-200"
                : "group-hover/user:decoration-carbon-800",
            isDark ? "text-carbon-100" : "text-carbon-800",
            "text-caption-30 font-sans font-medium underline decoration-transparent transition-colors"
          )}
        >
          {getName(user)}
        </div>
        {(user.orcid || user.username) && (
          <div
            className={cn(
              "text-caption-10 mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0 font-sans",
              isDark ? "text-gray-blue-100/60" : "text-gray-blue-900/60"
            )}
          >
            {user.orcid &&
              (allowLinks ? (
                <a
                  className={cn(
                    "group/orcid pointer-events-auto",
                    isDark
                      ? "hover:decoration-gray-blue-100/60"
                      : "hover:decoration-gray-blue-900/60",
                    orcidSpanClass
                  )}
                  href={`https://orcid.org/${user.orcid}`}
                  rel="noopener noreferrer"
                  target="_blank"
                  onClick={(e) => e.stopPropagation()}
                >
                  {orcid}
                </a>
              ) : (
                <span
                  className={cn(
                    isDark
                      ? "group-hover/user:decoration-gray-blue-100/60"
                      : "group-hover/user:decoration-gray-blue-900/60",
                    orcidSpanClass
                  )}
                >
                  {orcid}
                </span>
              ))}
            {user.username &&
              (allowLinks ? (
                <a
                  className={cn(
                    "pointer-events-auto",
                    isDark
                      ? "hover:decoration-gray-blue-100/60"
                      : "hover:decoration-gray-blue-900/60",
                    usernameSpanClass
                  )}
                  href={`/users/${user.username}`}
                  rel="noopener noreferrer"
                  target="_blank"
                  onClick={(e) => e.stopPropagation()}
                >
                  @{user.username}
                </a>
              ) : (
                <span
                  className={cn(
                    isDark
                      ? "group-hover/user:decoration-gray-blue-100/60"
                      : "group-hover/user:decoration-gray-blue-900/60",
                    usernameSpanClass
                  )}
                >
                  @{user.username}
                </span>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}

export type UserSelectHandle = {
  focus: () => void;
};

export interface UserSelectProps<
  TUser extends LimitedUser | LimitedUserV1
> extends Omit<InputHTMLAttributes<HTMLInputElement>, "onSelect"> {
  className?: string;
  defaultQuery?: string;
  disabled?: boolean;
  id?: string;
  /** Overrides for the search field, e.g. to render it as a token well. */
  inputClassName?: string;
  inputContainerClassName?: string;
  placeholder?: string;
  ref?: React.Ref<UserSelectHandle>;
  refocusOnSelect?: boolean;
  searchFunction: (term: string) => Promise<TUser[]>;
  selectedButtonClassName?: string;
  showUserItemOnSelect?: boolean;
  onBlur?: ComponentProps<typeof Combobox>["onBlur"];
  onSelect: (user: TUser) => void;
}

/**
 * A {@link Combobox} preconfigured to search users via `searchUsers`, owning
 * its own query/debounce/results state. Selection and blur behavior are left
 * to the caller.
 */
export function UserSelect<TUser extends LimitedUser | LimitedUserV1>({
  className,
  defaultQuery,
  disabled,
  id,
  inputClassName,
  inputContainerClassName,
  placeholder = "Search contributors…",
  ref,
  refocusOnSelect = false,
  searchFunction,
  selectedButtonClassName,
  showUserItemOnSelect = true,
  onBlur,
  onSelect,
  ...props
}: UserSelectProps<TUser>) {
  const comboboxRef = useRef<ComboboxHandle>(null);
  const [isDebounced, setIsDebounced] = useState<boolean>(false);
  const [searchValue, setSearchValue] = useState<string>(defaultQuery ?? "");
  const [displayedSearchResults, setDisplayedSearchResults] = useState<TUser[]>(
    []
  );
  const [selectedUser, setSelectedUser] = useState<TUser | null>(null);
  const [cachedUser, setCachedUser] = useState<TUser | null>(null);
  const { data: searchResults, isPending } = useQuery<TUser[]>({
    queryKey: ["add_contributor_search", searchValue],
    queryFn: () => searchFunction(searchValue),
    enabled: searchValue.length > 0
  });
  useEffect(() => {
    if (searchResults) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDisplayedSearchResults(searchResults ?? []);
    }
  }, [searchResults, setDisplayedSearchResults]);

  const debouncedCallback = useMemo(
    () =>
      debounce((newValue: string) => {
        setSearchValue(newValue);
        setIsDebounced(false);
      }, 500),
    [setIsDebounced, setSearchValue]
  );
  useEffect(() => () => debouncedCallback.cancel(), [debouncedCallback]);
  const debouncedSearch = useMemo(
    () => (newValue: string) => {
      setIsDebounced(true);
      debouncedCallback(newValue);
    },
    [debouncedCallback, setIsDebounced]
  );

  useImperativeHandle(ref, () => ({
    focus: () => comboboxRef.current?.focus()
  }));

  useEffect(() => {
    if (props.value != null) {
      // Straight from props is ok
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSearchValue(String(props.value));
    }
  }, [props.value]);

  return selectedUser ? (
    <div
      className={cn(
        "relative isolate rounded-lg p-2 hover:bg-gray-300",
        selectedButtonClassName
      )}
    >
      {/*
       * UserItem renders real <a> tags (orcid/username) when allowLinks is
       * set, so this can't itself be a <button> — nesting interactive
       * elements is invalid and breaks click/keyboard handling for both.
       * Instead this invisible button is stretched to cover the whole card
       * (the "stretched link" pattern) and sits behind the visible content,
       * which is marked pointer-events-none so clicks pass through to it —
       * except on the two <a> tags, which re-enable pointer-events to stay
       * independently clickable.
       */}
      <button
        aria-label={`Search for a different user (currently ${getName(selectedUser)})`}
        className="absolute inset-0 rounded-[inherit]"
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setSearchValue(selectedUser.username);
          setCachedUser(selectedUser);
          setSelectedUser(null);
          setTimeout(() => comboboxRef.current?.focus(), 0);
        }}
      />
      <div className="pointer-events-none relative z-10">
        <UserItem allowLinks user={selectedUser} />
      </div>
    </div>
  ) : (
    <Combobox
      ref={comboboxRef}
      className={className}
      disabled={disabled}
      emptyMessage="No users found"
      iconLeft={{ Icon: SearchIcon }}
      id={id}
      inputClassName={inputClassName}
      inputContainerClassName={inputContainerClassName}
      items={
        searchValue.length > 0
          ? displayedSearchResults.map((u) => ({
              key: u.username,
              label: getName(u),
              value: u,
              disabled: false
            }))
          : []
      }
      listItemRenderer={(option) => <UserItem isDark user={option.value} />}
      loading={isDebounced || isPending}
      placeholder={placeholder}
      query={searchValue}
      refocusOnSelect={refocusOnSelect}
      onBlur={(e) => {
        if (cachedUser) {
          setSelectedUser(cachedUser);
        }
        onBlur?.(e);
      }}
      onQueryChange={debouncedSearch}
      onSelect={(user) => {
        setSearchValue("");
        if (showUserItemOnSelect) {
          setSelectedUser(user);
        }
        onSelect(user);
      }}
      {...props}
    />
  );
}

export default UserSelect;
