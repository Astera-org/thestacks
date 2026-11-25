import { getAllUserNotifications } from "@/api/notifications";
import { getUserOrganizations, getUserPublications } from "@/api/users";
import {
  InboxIcon,
  MailIcon,
  NewsIcon,
  SettingsIcon
} from "@/components/icons";
import Link from "@/components/Link";
import OrcidProfileLink from "@/components/OrcidProfileLink";
import ProfilePageHeader from "@/components/ProfilePageHeader";
import Button from "@/components/stacks-ui/Button";
import { ScrollMask } from "@/components/stacks-ui/ScrollMask";
import { Tabs, TabsList, TabsTrigger } from "@/components/stacks-ui/Tabs";
import useAppNavigate from "@/hooks/useAppNavigate";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { Outlet, useLocation } from "react-router";

export default function AccountLayout() {
  const { user, isPending, profileError, retryProfile } = useAuth();

  const navigate = useAppNavigate();
  const location = useLocation();

  // Get user organizations.
  const { data: organizations } = useQuery({
    queryKey: ["user_organizations", user?.id],
    queryFn: () => getUserOrganizations(user!.id),
    enabled: !!user
  });

  // Tab counts: page-1 fetches of a single item, just for `pagination.total`.
  // TODO: show the unread notification count instead of the total once the
  // API exposes it.
  const { data: notificationsData } = useQuery({
    queryKey: ["user_notifications_total", user?.id],
    queryFn: () => getAllUserNotifications({ page: 1, per_page: 1 }),
    enabled: !!user
  });

  const { data: publicationsData } = useQuery({
    queryKey: ["user_publications_total", user?.id],
    queryFn: () => getUserPublications(user!.id, { page: 1, per_page: 1 }),
    enabled: !!user
  });

  // Redirect to login if not authenticated, once the session has resolved —
  // `user` is momentarily null while it's still loading.
  useEffect(() => {
    if (!isPending && !user && !profileError) {
      navigate("/login");
    }
  }, [user, isPending, profileError, navigate]);

  if (isPending) {
    return null;
  }

  if (profileError && !user) {
    return (
      <div
        role="alert"
        className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center"
      >
        <p className="text-body-40 text-error-800">
          We couldn’t load your account.
        </p>
        <Button onClick={retryProfile}>Try again</Button>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const primaryOrganization = organizations?.[0] ?? user.organization;
  const displayName = `${user.first_name} ${user.last_name}`;

  const orcidBadge = user.orcid ? (
    <OrcidProfileLink orcid={user.orcid} />
  ) : null;

  const tabs = [
    {
      value: "/account/notifications",
      label: "Notifications",
      icon: <InboxIcon className="size-5" />,
      count: notificationsData?.pagination?.total
    },
    {
      value: "/account/publications",
      label: "Publications",
      icon: <NewsIcon className="size-5" />,
      count: publicationsData?.pagination.total
    },
    {
      value: "/account/settings",
      label: "Settings",
      icon: <SettingsIcon className="size-5" />,
      count: undefined
    }
  ];

  // `/account` resolves to the notifications tab.
  const activeValue =
    location.pathname === "/account"
      ? "/account/notifications"
      : location.pathname;

  return (
    <div>
      <div data-vt="account-header">
        <ProfilePageHeader
          name={displayName}
          avatar={user.avatar}
          badge={orcidBadge}
          subtitle={
            primaryOrganization && (
              <Link
                to={`/organizations/${primaryOrganization.slug}`}
                className="hover:underline hover:underline-offset-4"
              >
                {primaryOrganization.name}
              </Link>
            )
          }
          chip={
            <a
              href={`mailto:${user.email}`}
              className="group text-fg-strong flex items-center gap-3"
            >
              <span className="border-gray-blue-900 flex size-7 shrink-0 items-center justify-center rounded-full border md:size-9">
                <MailIcon className="size-5" />
              </span>
              <span className="text-caption-40 font-mono break-all group-hover:underline">
                {user.email}
              </span>
            </a>
          }
          className="bg-page-header"
        />

        {/* Section tabs. These navigate between routes, so changing the active
          tab pushes the corresponding path. */}
        <Tabs
          value={activeValue}
          onValueChange={(value) => navigate(value)}
          activationMode="manual"
          className="max-w-container mx-auto md:px-8"
        >
          {/* Full-bleed on mobile so tabs scroll off the screen edges; the
            gutter lives on the flex scroller itself so the first and last tab
            keep the offset at both scroll extremes. */}
          <ScrollMask asChild className="gap-6 px-4 md:px-0">
            <TabsList aria-label="Account sections">
              {tabs.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value}>
                  {tab.icon}
                  <span>{tab.label}</span>
                  {tab.count != null && <span>{tab.count}</span>}
                </TabsTrigger>
              ))}
            </TabsList>
          </ScrollMask>
        </Tabs>
      </div>

      {/* Content. */}
      <div className="max-w-container mx-auto w-full px-4 py-10 md:px-8">
        <Outlet />
      </div>
    </div>
  );
}
