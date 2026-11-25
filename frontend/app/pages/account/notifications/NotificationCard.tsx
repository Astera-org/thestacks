import { MoreVerticalIcon } from "@/components/icons";
import Link from "@/components/Link";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import Avatar from "@/components/stacks-ui/Avatar";
import Checkbox from "@/components/stacks-ui/Checkbox";
import {
  Dropdown,
  DropdownContent,
  DropdownItem,
  DropdownTrigger
} from "@/components/stacks-ui/Dropdown";
import IconButton from "@/components/stacks-ui/IconButton";
import { TimeFromNow } from "@/components/TimeFromNow";
import { commentIdToHash } from "@/lib/commentNavigation";
import { cn, formatDate, formatTime, isWithinDays } from "@/lib/utils";
import type { Notification } from "@/types";

type UnavailableCommentState = Exclude<
  NonNullable<Notification["comment_state"]>,
  "PUBLISHED"
>;

const COMMENT_UNAVAILABLE_MESSAGES: Record<UnavailableCommentState, string> = {
  MODERATED: "This comment was moderated",
  DELETED: "This comment was removed",
  WITHDRAWN: "This comment was withdrawn"
};

export interface NotificationCardProps {
  notification: Notification;
  /** When true the card shows a checkbox and the whole row toggles selection. */
  selectionMode: boolean;
  selected: boolean;
  onSelectChange: () => void;
  onMarkRead: () => void;
  onMarkUnread: () => void;
  onDelete: () => void;
}

export default function NotificationCard(props: NotificationCardProps) {
  const {
    notification,
    selectionMode,
    selected,
    onSelectChange,
    onMarkRead,
    onMarkUnread,
    onDelete
  } = props;
  const formattedDate = formatDate(notification.created_at, "MMM D, YYYY");
  const formattedTime = formatTime(notification.created_at);
  const isRead = notification.seen === 1;
  const commentAuthorName = notification.comment_author
    ? `${notification.comment_author.first_name} ${notification.comment_author.last_name}`
    : null;
  const avatarSrc = notification.comment_author
    ? notification.comment_author.avatar
    : (notification.publication_org?.avatar ?? null);
  const avatarAlt = commentAuthorName ?? "";
  const hasAvatar = Boolean(
    notification.comment_author ?? notification.publication_org
  );
  const verb =
    notification.state?.toUpperCase() === "COMMENT"
      ? "commented"
      : notification.state?.toUpperCase() === "REPLY"
        ? "replied"
        : null;
  const excerptText = commentAuthorName
    ? (notification.comment_text_excerpt ?? notification.message)
    : notification.comment_text_excerpt;
  const commentUnavailableMessage =
    notification.comment_id != null &&
    notification.comment_state &&
    notification.comment_state !== "PUBLISHED"
      ? (COMMENT_UNAVAILABLE_MESSAGES[notification.comment_state] ?? null)
      : null;

  const href = notification.publication_slug
    ? `/publications/${notification.publication_slug}${
        notification.comment_id
          ? `#${commentIdToHash(notification.comment_id)}`
          : ""
      }`
    : null;

  const handleClick = () => {
    if (!isRead) {
      onMarkRead();
    }
  };

  const body = (
    <article
      className={cn(
        "relative flex flex-1 flex-col gap-3 rounded-lg border p-4 transition md:p-6",
        // Unread sits on the page like a publication card; read lies flat on it.
        isRead
          ? "bg-surface-sunken group-hover:bg-surface-accent border-transparent"
          : "bg-surface border-border-strong shadow-press group-hover:shadow-lift"
      )}
    >
      {/* Same author block as comment threads: avatar, then who and when. */}
      <div className="flex items-center gap-3 pr-10">
        {hasAvatar ? (
          <Avatar src={avatarSrc} alt={avatarAlt} />
        ) : (
          <div className="size-9 shrink-0" aria-hidden="true" />
        )}
        <div className="flex min-w-0 flex-col">
          {/* Unread is bold and dark, read falls back to the muted meta
              color, so the weight and contrast difference carries the state. */}
          <div
            className={cn(
              "text-body-20 [&_p]:line-clamp-2",
              isRead ? "text-fg-muted" : "text-fg-strong font-semibold"
            )}
          >
            {verb && commentAuthorName ? (
              <p>
                {commentAuthorName} {verb}
              </p>
            ) : (
              <MarkdownRenderer markdown={notification.message} />
            )}
          </div>
          <div className="text-body-20 text-fg-muted flex items-center gap-2">
            {!isRead && (
              <span className="bg-periwinkle-500 size-2 shrink-0 rounded-full">
                <span className="sr-only">Unread</span>
              </span>
            )}
            <time
              dateTime={notification.created_at}
              title={`${formattedDate} · ${formattedTime}`}
            >
              {/* Relative time stops being useful past a week ("4 months ago"). */}
              {isWithinDays(notification.created_at, 7) ? (
                <TimeFromNow date={notification.created_at} />
              ) : (
                formattedDate
              )}
            </time>
          </div>
        </div>
      </div>
      {(notification.publication_title ||
        commentUnavailableMessage ||
        excerptText) && (
        <div className="flex min-w-0 flex-col gap-2 md:pl-12">
          {notification.publication_title && (
            <div
              className={cn(
                "text-body-50 font-serif [&_p]:line-clamp-2 md:[&_p]:line-clamp-1",
                isRead ? "text-fg-muted" : "text-carbon-800"
              )}
            >
              <MarkdownRenderer markdown={notification.publication_title} />
            </div>
          )}
          {(commentUnavailableMessage ?? excerptText) && (
            <blockquote className="border-gray-blue-100 text-fg-muted text-body-30 line-clamp-2 max-w-full border-l-2 pl-3 break-words">
              {commentUnavailableMessage ?? excerptText}
            </blockquote>
          )}
        </div>
      )}
    </article>
  );

  // Selection mode: the whole row is one large click target via a wrapping
  // label, so tapping anywhere toggles the checkbox.
  if (selectionMode) {
    return (
      <li>
        <label className="flex cursor-pointer items-center gap-3 md:gap-4">
          <Checkbox
            checked={selected}
            onChange={onSelectChange}
            aria-label={`Select notification: ${notification.comment_text_excerpt ?? notification.message}`}
          />
          {body}
        </label>
      </li>
    );
  }

  return (
    <li className="group relative">
      {href ? (
        <Link to={href} className="flex rounded-lg" onClick={handleClick}>
          {body}
        </Link>
      ) : !isRead ? (
        <button
          type="button"
          aria-label="Mark as read"
          className="flex w-full cursor-pointer rounded-lg text-left"
          onClick={handleClick}
        >
          {body}
        </button>
      ) : (
        body
      )}
      <Dropdown>
        <DropdownTrigger asChild>
          <IconButton
            icon={<MoreVerticalIcon className="size-5" />}
            intent="ghost"
            size="sm"
            pill
            aria-label="Notification actions"
            className="absolute top-4 right-2 transition-opacity md:top-6 md:right-4 md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100 md:data-[state=open]:opacity-100"
          />
        </DropdownTrigger>
        <DropdownContent align="end">
          {isRead ? (
            <DropdownItem onSelect={onMarkUnread}>Mark as unread</DropdownItem>
          ) : (
            <DropdownItem onSelect={onMarkRead}>Mark as read</DropdownItem>
          )}
          <DropdownItem onSelect={onDelete}>Delete</DropdownItem>
        </DropdownContent>
      </Dropdown>
    </li>
  );
}
