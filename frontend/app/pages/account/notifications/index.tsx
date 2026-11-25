import {
  deleteAllNotifications,
  deleteNotification,
  deleteSelectedNotifications,
  getAllUserNotifications,
  getNotificationTypes,
  markAllNotifications,
  markNotification,
  markSelectedNotifications
} from "@/api/notifications";
import { InboxIcon, TrashIcon } from "@/components/icons";
import Button from "@/components/stacks-ui/Button";
import Checkbox from "@/components/stacks-ui/Checkbox";
import NoResults from "@/components/stacks-ui/NoResults";
import { Pagination } from "@/components/stacks-ui/Pagination";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { toSentenceCase } from "@/lib/utils";
import type { PaginatedNotifications } from "@/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ListChecks } from "lucide-react";
import { useState } from "react";
import NotificationCard from "./NotificationCard";

const PER_PAGE = 9;
// Lowercase so it cannot collide with the API's uppercase type names.
const ALL_FILTER = "all";

export function meta() {
  return [{ title: "Notifications | Account | The Stacks" }];
}

export default function AccountNotificationsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [stateFilter, setStateFilter] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  // Set once the user clicks "Select all N notifications" below the page-level
  // checkbox. Distinct from `selectedIds`, which only ever holds this page's ids.
  const [allSelected, setAllSelected] = useState(false);
  // "selected" confirms the bulk delete button; a number confirms that one
  // notification's delete action from its "..." menu.
  const [deleteTarget, setDeleteTarget] = useState<"selected" | number | null>(
    null
  );

  const { data, isLoading, isError } = useQuery<PaginatedNotifications>({
    queryKey: ["user_notifications", user?.id, page, stateFilter],
    queryFn: () =>
      getAllUserNotifications({
        page,
        per_page: PER_PAGE,
        state: stateFilter ?? undefined
      }),
    enabled: !!user
  });

  const notifications = data?.items ?? [];
  const total = data?.pagination?.total ?? 0;
  const totalPages = Math.ceil(total / PER_PAGE);

  // Deleting the last notifications on a page (e.g. bulk-deleting page 2 of 2)
  // shrinks totalPages out from under the current page; snap back during render
  // so the user isn't stranded on a page that no longer exists. (Adjusting
  // state when a derived value changes: https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes)
  const [prevTotalPages, setPrevTotalPages] = useState(totalPages);
  if (totalPages !== prevTotalPages) {
    setPrevTotalPages(totalPages);
    if (totalPages > 0 && page > totalPages) {
      setPage(totalPages);
    }
  }

  // Independent of `page`/`stateFilter`: the full set of types this user has
  // ever received, not just whatever's on the currently loaded page.
  const { data: availableStates = [] } = useQuery({
    queryKey: ["user_notification_types", user?.id],
    queryFn: getNotificationTypes,
    enabled: !!user
  });

  const changeFilter = (value: string) => {
    setStateFilter(value === ALL_FILTER ? null : value);
    setPage(1);
    setSelectedIds(new Set());
    setAllSelected(false);
    setSelectionMode(false);
  };

  const filterOptions = [
    { value: ALL_FILTER, label: "All" },
    ...availableStates.map((state) => ({
      value: state,
      label: toSentenceCase(state.replace(/_/g, " "))
    }))
  ];

  const allPageSelected =
    notifications.length > 0 &&
    notifications.every((n) => selectedIds.has(n.id));
  const somePageSelected = notifications.some((n) => selectedIds.has(n.id));
  const hasSelection = allSelected || selectedIds.size > 0;
  const hasMorePages = total > notifications.length;
  const showFilters = availableStates.length > 1 || stateFilter !== null;

  const toggleSelected = (id: number) => {
    setAllSelected(false);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    setAllSelected(false);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      notifications.forEach((n) =>
        allPageSelected ? next.delete(n.id) : next.add(n.id)
      );
      return next;
    });
  };

  const refetchNotifications = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ["user_notifications"] }),
      queryClient.invalidateQueries({ queryKey: ["user_notifications_total"] }),
      queryClient.invalidateQueries({ queryKey: ["user_notification_types"] })
    ]);

  const markSelectedMutation = useMutation({
    mutationFn: (seen: number) =>
      allSelected
        ? markAllNotifications(
            seen,
            notifications[0]?.id,
            stateFilter ?? undefined
          )
        : markSelectedNotifications([...selectedIds], seen),
    onSuccess: () => {
      setSelectedIds(new Set());
      setAllSelected(false);
      return refetchNotifications();
    }
  });

  const deleteSelectedMutation = useMutation({
    mutationFn: () =>
      allSelected
        ? deleteAllNotifications(notifications[0]?.id, stateFilter ?? undefined)
        : deleteSelectedNotifications([...selectedIds]),
    onSuccess: () => {
      setSelectedIds(new Set());
      setAllSelected(false);
      return refetchNotifications();
    }
  });

  const markOneMutation = useMutation({
    mutationFn: ({ id, seen }: { id: number; seen: number }) =>
      markNotification(id, seen),
    onSuccess: (_data, { id }) => {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      return refetchNotifications();
    }
  });

  const deleteOneMutation = useMutation({
    mutationFn: (id: number) => deleteNotification(id),
    onSuccess: (_data, id) => {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      return refetchNotifications();
    }
  });

  const exitSelection = () => {
    setSelectionMode(false);
    setSelectedIds(new Set());
    setAllSelected(false);
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
    setAllSelected(false);
  };

  const confirmDelete = () => {
    if (deleteTarget === "selected") {
      deleteSelectedMutation.mutate(undefined, {
        onSuccess: () => setDeleteTarget(null)
      });
    } else if (deleteTarget !== null) {
      deleteOneMutation.mutate(deleteTarget, {
        onSuccess: () => setDeleteTarget(null)
      });
    }
  };

  const deleteCount =
    deleteTarget === "selected" ? (allSelected ? total : selectedIds.size) : 1;
  const deleteDialogTitle =
    deleteCount === 1
      ? "Delete notification"
      : `Delete ${deleteCount} notifications`;
  const isDeletePending =
    deleteSelectedMutation.isPending || deleteOneMutation.isPending;

  return (
    <div>
      {/* The active tab already titles the section; kept for the heading outline. */}
      <h2 className="sr-only">Notifications</h2>

      {(showFilters || notifications.length > 0) && (
        <div className="flex items-start justify-between gap-4">
          {/* Type filter, styled like the license picker in the pub editor.
              Only types the user actually has notifications for show up, and
              a single type has nothing to filter. */}
          {showFilters && (
            <div
              role="group"
              aria-label="Filter notifications by type"
              className="flex flex-wrap items-center gap-2"
            >
              {filterOptions.map((option) => {
                const active = (stateFilter ?? ALL_FILTER) === option.value;
                return (
                  <Button
                    key={option.value}
                    aria-pressed={active}
                    intent={active ? "primary" : "outline"}
                    size="sm"
                    className="gap-1.5"
                    onClick={() => changeFilter(option.value)}
                  >
                    {active && <Check aria-hidden className="size-3.5" />}
                    {option.label}
                  </Button>
                );
              })}
            </div>
          )}
          {/* Select toggle: bulk selection is opt-in, not always on. A text
              action like the publication card's "Edit", so it reads apart
              from the filter pills. */}
          {notifications.length > 0 && (
            <button
              type="button"
              onClick={
                selectionMode ? exitSelection : () => setSelectionMode(true)
              }
              className="text-fg-strong text-caption-40 ml-auto flex min-h-8 shrink-0 items-center gap-2 font-mono hover:underline hover:underline-offset-4"
            >
              {selectionMode ? (
                <Check aria-hidden className="size-4" />
              ) : (
                <ListChecks aria-hidden className="size-4" />
              )}
              {selectionMode ? "Done" : "Select"}
            </button>
          )}
        </div>
      )}

      {/* Bulk action bar. Only present while in selection mode. */}
      {selectionMode && notifications.length > 0 && (
        <div className="mt-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <Checkbox
            align="center"
            checked={allPageSelected}
            indeterminate={!allPageSelected && somePageSelected}
            onChange={toggleSelectAll}
          >
            <span className="text-caption-50 font-mono">Select all</span>
          </Checkbox>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              intent="secondary"
              disabled={!hasSelection || markSelectedMutation.isPending}
              onClick={() => markSelectedMutation.mutate(1)}
              size="sm"
            >
              Mark as read
            </Button>
            <Button
              intent="secondary"
              disabled={!hasSelection || markSelectedMutation.isPending}
              onClick={() => markSelectedMutation.mutate(0)}
              size="sm"
            >
              Mark as unread
            </Button>
            <Button
              intent="primary"
              disabled={!hasSelection || deleteSelectedMutation.isPending}
              onClick={() => setDeleteTarget("selected")}
              size="sm"
              className="gap-1.5"
            >
              <TrashIcon className="size-4" />
              Delete
            </Button>
          </div>
        </div>
      )}

      {/* Gmail-style prompt to extend the selection past the current page. */}
      {selectionMode && hasMorePages && allPageSelected && (
        <p className="text-caption-50 text-fg-strong mt-3 font-mono">
          {allSelected ? (
            <>
              All {total} notifications are selected.{" "}
              <button
                type="button"
                onClick={clearSelection}
                className="underline underline-offset-4 hover:no-underline"
              >
                Clear selection
              </button>
            </>
          ) : (
            <>
              All {notifications.length} notifications on this page are
              selected.{" "}
              <button
                type="button"
                onClick={() => setAllSelected(true)}
                className="underline underline-offset-4 hover:no-underline"
              >
                Select all {total} notifications
              </button>
            </>
          )}
        </p>
      )}

      {/* Notifications list. */}
      {isLoading && notifications.length === 0 ? (
        <p className="text-body-40 text-fg-muted mt-6 py-16 text-center">
          Loading notifications...
        </p>
      ) : isError && notifications.length === 0 ? (
        <p className="text-body-40 text-error-800 mt-6 py-16 text-center">
          Failed to load notifications.
        </p>
      ) : notifications.length === 0 ? (
        <NoResults
          className="mt-6"
          icon={InboxIcon}
          title="You're all caught up"
          description="New comments, follows, and updates on your work will show up here."
        />
      ) : (
        <ul className="mt-6 flex flex-col gap-4">
          {notifications.map((notification) => (
            <NotificationCard
              key={notification.id}
              notification={notification}
              selectionMode={selectionMode}
              selected={selectedIds.has(notification.id)}
              onSelectChange={() => toggleSelected(notification.id)}
              onMarkRead={() =>
                markOneMutation.mutate({ id: notification.id, seen: 1 })
              }
              onMarkUnread={() =>
                markOneMutation.mutate({ id: notification.id, seen: 0 })
              }
              onDelete={() => setDeleteTarget(notification.id)}
            />
          ))}
        </ul>
      )}

      {/* Pagination. */}
      <Pagination
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
        className="pt-16"
      />

      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent className="sm:max-w-108">
          <DialogHeader>
            <DialogTitle>{deleteDialogTitle}</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              {deleteCount === 1
                ? "this notification"
                : `these ${deleteCount} notifications`}
              ? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <DialogClose asChild>
              <Button intent="secondary" disabled={isDeletePending}>
                Cancel
              </Button>
            </DialogClose>
            <Button
              intent="destructive"
              onClick={confirmDelete}
              disabled={isDeletePending}
            >
              {isDeletePending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
