import { logout as apiLogout } from "@/api/auth";
import { getAllUserNotifications } from "@/api/notifications";
import { ContactUsModal } from "@/components/ContactUsModal";
import { ArrowUpIcon } from "@/components/icons";
import BellIcon from "@/components/icons/Bell";
import TheStacksLogo from "@/components/icons/TheStacksLogo";
import Link from "@/components/Link";
import Avatar from "@/components/stacks-ui/Avatar";
import Button from "@/components/stacks-ui/Button";
import {
  Dropdown,
  DropdownContent,
  DropdownItem,
  DropdownTrigger
} from "@/components/stacks-ui/Dropdown";
import { useAuth } from "@/hooks/useAuth";
import { useHideOnScrollDown } from "@/hooks/useHideOnScrollDown";
import { withAuthRedirect } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { PaginatedNotifications } from "@/types";
import { useQuery } from "@tanstack/react-query";
import { useIsClient } from "@uidotdev/usehooks";
import { useCallback, useState } from "react";
import { useLocation } from "react-router";

export default function Navbar() {
  const { user, logout } = useAuth();
  const isClientSide = useIsClient();
  const isHidden = useHideOnScrollDown();
  const location = useLocation();
  const [contactUsModalOpen, setContactUsModalOpen] = useState(false);

  // Unread-notification state powering the bell indicator dot. The key
  // shares the "user_notifications" prefix so that mutations on the
  // notifications page (mark read/unread, delete) invalidate this query too.
  const { data: notifications } = useQuery<PaginatedNotifications>({
    queryKey: ["user_notifications", "unread"],
    queryFn: () =>
      getAllUserNotifications({
        page: 1,
        per_page: 20
      }),
    enabled: Boolean(user)
  });
  const hasUnreadNotifications =
    notifications?.items?.some((note) => note.seen === 0) ?? false;

  const handleLogOut = useCallback(async () => {
    try {
      await apiLogout();
    } finally {
      logout();
      window.location.replace("/");
    }
  }, [logout]);

  return (
    <header
      data-vt="navbar"
      className={cn(
        "bg-nav h-navbar fixed top-0 right-0 left-0 z-100 flex items-center transition-transform duration-300 ease-out print:hidden",
        isHidden && "-translate-y-full"
      )}
    >
      <div className="max-w-container mx-auto flex w-full items-center justify-between px-4 md:px-8">
        {/* Logo. */}
        <Link to="/" aria-label="Home">
          <TheStacksLogo className="text-fg-strong h-auto w-20 md:w-30" />
        </Link>

        {/* User is logged in. */}
        {user && isClientSide && (
          <div className="flex items-center gap-4 md:gap-6">
            {/* Create pub button. */}
            {user.can_create_publications && (
              <Button asChild size="sm" className="hidden md:inline-flex">
                <Link to="/publications/new">Create a pub</Link>
              </Button>
            )}

            {/* Notifications button. */}
            <Link to="/account/notifications" className="relative">
              <BellIcon className="text-fg-strong hover:text-fg-strong/75 size-5 cursor-pointer" />
              {/* Unread notification indicator. */}
              {hasUnreadNotifications && (
                <span className="bg-periwinkle-500 ring-off-white absolute -top-0.5 -right-0.5 size-2 rounded-full ring-2" />
              )}
            </Link>

            {/* User dropdown menu. */}
            <Dropdown modal={false}>
              {/* User avatar and name. */}
              <DropdownTrigger className="group flex items-center justify-between px-2">
                <div className="flex items-center gap-2">
                  <Avatar
                    src={user.avatar}
                    alt={`${user.first_name} ${user.last_name}`}
                    className="size-9"
                  />
                  <span className="text-caption-50 text-fg-strong hidden pe-3 font-mono md:block">
                    {user.first_name} {user.last_name}
                  </span>
                </div>
                <ArrowUpIcon className="text-fg-subtle hidden size-5 rotate-180 md:block" />
              </DropdownTrigger>

              {/* Dropdown menu content. */}
              {/* TODO: We probably want to use a slide-up sheet on mobile. */}
              <DropdownContent align="end" side="bottom" sideOffset={8}>
                <div className="text-caption-40 text-fg-inverted px-3 py-1.5 font-semibold">
                  My account
                </div>
                <div className="bg-gray-blue-700 my-1 h-px" />
                {/* Create-pub action — surfaces here on mobile where the header button is hidden. */}
                {user.can_create_publications && (
                  <>
                    <DropdownItem asChild className="md:hidden">
                      <Link to="/publications/new">Create a pub</Link>
                    </DropdownItem>
                    <div className="bg-gray-blue-700 my-1 h-px md:hidden" />
                  </>
                )}
                <DropdownItem asChild>
                  <Link to={`/users/${user.username}`}>Profile</Link>
                </DropdownItem>
                <DropdownItem asChild>
                  <Link to="/account/publications">Publications</Link>
                </DropdownItem>
                <DropdownItem asChild>
                  <Link to="/account/settings">Settings</Link>
                </DropdownItem>
                <div className="bg-gray-blue-700 my-1 h-px" />
                {user.can_contact_us && (
                  <>
                    <DropdownItem onClick={() => setContactUsModalOpen(true)}>
                      Contact Us
                    </DropdownItem>
                    <div className="bg-gray-blue-700 my-1 h-px" />
                  </>
                )}
                <DropdownItem onClick={handleLogOut}>Log out</DropdownItem>
              </DropdownContent>
            </Dropdown>

            {user.can_contact_us && (
              <ContactUsModal
                open={contactUsModalOpen}
                onOpenChange={setContactUsModalOpen}
              />
            )}
          </div>
        )}

        {/* User is NOT logged in. */}
        {!user && isClientSide && (
          <div className="flex items-center gap-3">
            <Button asChild intent="secondary">
              <Link to="/register" state={withAuthRedirect(location)}>
                Sign up
              </Link>
            </Button>
            <Button asChild>
              <Link to="/login" state={withAuthRedirect(location)}>
                Log in
              </Link>
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
