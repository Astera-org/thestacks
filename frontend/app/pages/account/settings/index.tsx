import AccountSettingsForm from "@/components/settings/AccountSettingsForm";
import NotificationSettingsForm from "@/components/settings/NotificationSettingsForm";
import PasswordChangeForm from "@/components/settings/PasswordChangeForm";
import ProfileSettingsForm from "@/components/settings/ProfileSettingsForm";
import useAppNavigate from "@/hooks/useAppNavigate";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { useMemo } from "react";
import { useLocation } from "react-router";

type View = "account" | "profile" | "notifications" | "password";

const VIEWS: { value: View; label: string }[] = [
  { value: "account", label: "Account" },
  { value: "profile", label: "Profile information" },
  { value: "notifications", label: "Notifications" },
  { value: "password", label: "Password" }
];

export default function AccountSettingsPage() {
  const { user, isPending } = useAuth();

  const navigate = useAppNavigate();
  const location = useLocation();

  const view = useMemo<View>(() => {
    const hash = location.hash.replace("#", "");
    const match = VIEWS.find((v) => v.value === hash);
    return match?.value ?? "account";
  }, [location.hash]);

  const switchView = (v: View) => {
    navigate(`#${v}`, { replace: true });
  };

  // Wait for the session to resolve before deciding whether to redirect —
  // `user` is momentarily null while it's still loading.
  if (isPending) {
    return null;
  }

  if (!user) {
    navigate("/login");
    return null;
  }

  const viewLabel = VIEWS.find((v) => v.value === view)!.label;

  return (
    <div>
      <title>{`Settings | ${viewLabel} | The Stacks`}</title>

      {/* The active tab already titles the section; kept for the heading outline. */}
      <h2 className="sr-only">Settings</h2>

      <div className="flex flex-col gap-10 md:flex-row md:gap-12">
        {/* Sub-navigation. Switches the form in place via the location hash,
            so it is a button list rather than links. */}
        <nav className="shrink-0 md:w-56">
          <ul className="flex flex-col">
            {VIEWS.map((v) => (
              <li key={v.value}>
                <button
                  type="button"
                  onClick={() => switchView(v.value)}
                  aria-current={view === v.value ? "true" : undefined}
                  className={cn(
                    "border-gray-blue-100 text-body-30 w-full border-b py-3 text-left transition-colors",
                    view === v.value
                      ? "text-fg-strong"
                      : "text-fg-subtle hover:text-fg-strong"
                  )}
                >
                  {v.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Form. */}
        <div className="min-w-0 flex-1">
          <h3 className="text-body-70 text-fg-strong mb-6">{viewLabel}</h3>

          {view === "account" ? (
            <AccountSettingsForm user={user} />
          ) : view === "profile" ? (
            <ProfileSettingsForm user={user} />
          ) : view === "notifications" ? (
            <NotificationSettingsForm
              unsubscribedType={location.state?.unsubscribedType}
            />
          ) : (
            <PasswordChangeForm />
          )}
        </div>
      </div>
    </div>
  );
}
