import {
  DELIVERY_METHOD,
  DeliveryMethod,
  getUserNotificationSettings,
  NotificationSetting,
  updateUserNotificationSetting
} from "@/api/notifications";
import { SpinnerIcon } from "@/components/icons";
import Switch from "@/components/stacks-ui/Switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip";
import useAppNavigate from "@/hooks/useAppNavigate";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useLocation } from "react-router";
import { toast } from "sonner";

const SETTINGS_QUERY_KEY = ["notification-settings"];

const subscriptionField = (method: DeliveryMethod) =>
  method === DELIVERY_METHOD.EMAIL
    ? ("is_subscribed_email" as const)
    : ("is_subscribed_in_app" as const);

const toggleKey = (type: string, method: DeliveryMethod) => `${type}:${method}`;

interface NotificationSettingsFormProps {
  unsubscribedType?: string;
}

export default function NotificationSettingsForm({
  unsubscribedType
}: NotificationSettingsFormProps) {
  const navigate = useAppNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  // Flash tooltip: consume location state so it doesn't reappear on
  // back/forward, but keep the value for rendering.
  const [flashType, setFlashType] = useState(unsubscribedType);
  useEffect(() => {
    if (!unsubscribedType) return;
    navigate(location.pathname + location.hash, { replace: true, state: {} });
  }, [location.hash, location.pathname, navigate, unsubscribedType]);

  const {
    data: settings,
    isLoading,
    isError
  } = useQuery({
    queryKey: SETTINGS_QUERY_KEY,
    queryFn: getUserNotificationSettings
  });

  // Track in-flight toggles individually so each switch shows its own spinner
  // and concurrent toggles don't block each other.
  const [pendingToggles, setPendingToggles] = useState<Set<string>>(new Set());

  const updateMutation = useMutation({
    mutationFn: updateUserNotificationSetting,
    // Flip the switch in the cache immediately; the request catches up.
    onMutate: async (payload) => {
      setFlashType(undefined);
      setPendingToggles((keys) =>
        new Set(keys).add(
          toggleKey(payload.notification_type, payload.delivery_method)
        )
      );

      await queryClient.cancelQueries({ queryKey: SETTINGS_QUERY_KEY });
      const previous =
        queryClient.getQueryData<NotificationSetting[]>(SETTINGS_QUERY_KEY);

      queryClient.setQueryData<NotificationSetting[]>(
        SETTINGS_QUERY_KEY,
        (current) =>
          current?.map((setting) =>
            setting.notification_type === payload.notification_type
              ? {
                  ...setting,
                  [subscriptionField(payload.delivery_method)]:
                    payload.is_subscribed
                }
              : setting
          )
      );

      return { previous };
    },
    onError: (error: Error, payload, context) => {
      // Revert only the failed switch so concurrent optimistic updates
      // survive.
      const field = subscriptionField(payload.delivery_method);
      const previousSetting = context?.previous?.find(
        (setting) => setting.notification_type === payload.notification_type
      );
      if (previousSetting) {
        queryClient.setQueryData<NotificationSetting[]>(
          SETTINGS_QUERY_KEY,
          (current) =>
            current?.map((setting) =>
              setting.notification_type === payload.notification_type
                ? { ...setting, [field]: previousSetting[field] }
                : setting
            )
        );
      }
      toast.error(error.message);
    },
    onSettled: (_data, _error, payload) => {
      setPendingToggles((keys) => {
        const next = new Set(keys);
        next.delete(
          toggleKey(payload.notification_type, payload.delivery_method)
        );
        return next;
      });
      // Resync with the server only once the last in-flight toggle settles,
      // so the refetch can't clobber another toggle's optimistic value.
      if (queryClient.isMutating() === 1) {
        return queryClient.invalidateQueries({ queryKey: SETTINGS_QUERY_KEY });
      }
    }
  });

  if (isLoading) {
    return (
      <div
        role="status"
        className="bg-surface flex items-center justify-center rounded-lg p-8"
      >
        <SpinnerIcon className="size-5 animate-spin" />
        <span className="sr-only">Loading notification settings</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-surface rounded-lg p-6 md:p-10">
        <p className="text-body-20 text-fg-subtle">
          Failed to load notification settings.
        </p>
      </div>
    );
  }

  if (!settings?.length) {
    return (
      <div className="bg-surface rounded-lg p-6 md:p-10">
        <p className="text-body-20 text-fg-subtle">
          No notification settings found.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-surface space-y-4 rounded-lg p-6 md:p-10">
      {/* Column headers */}
      <div className="flex items-center gap-4">
        <div className="flex-1" />
        <div className="flex gap-6">
          <div className="text-body-30 text-fg-strong w-16 text-center font-medium">
            Email
          </div>
          <div className="text-body-30 text-fg-strong w-16 text-center font-medium">
            In-app
          </div>
        </div>
      </div>

      {/* Notification rows */}
      {settings.map((setting) => (
        <div
          key={setting.notification_type}
          className="border-gray-blue-100 flex items-center gap-4 border-t pt-4"
        >
          <div className="flex-1">
            <p className="text-body-40 text-fg-strong font-sans font-medium">
              {setting.notification_name}
            </p>
            <p className="text-body-20 text-fg-subtle">
              {setting.notification_description}
            </p>
          </div>
          <div className="flex gap-6">
            {([DELIVERY_METHOD.EMAIL, DELIVERY_METHOD.IN_APP] as const).map(
              (method) => {
                const checked = setting[subscriptionField(method)];
                const showFlash =
                  method === DELIVERY_METHOD.EMAIL &&
                  flashType === setting.notification_type &&
                  !checked;
                const isPending = pendingToggles.has(
                  toggleKey(setting.notification_type, method)
                );
                // The visual name/description and the Email / In-app column
                // headers are layout only, so each switch carries its own name.
                const label = `${setting.notification_name} (${
                  method === DELIVERY_METHOD.EMAIL ? "email" : "in-app"
                })`;
                const onCheckedChange = (next: boolean) =>
                  updateMutation.mutate({
                    notification_type: setting.notification_type,
                    delivery_method: method,
                    is_subscribed: next
                  });

                return (
                  <div key={method} className="flex w-16 justify-center">
                    {showFlash ? (
                      <SwitchWithTooltip
                        label={label}
                        onCheckedChange={onCheckedChange}
                      />
                    ) : (
                      <Switch
                        aria-label={label}
                        checked={checked}
                        pending={isPending}
                        onCheckedChange={onCheckedChange}
                      />
                    )}
                  </div>
                );
              }
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * A Switch in the off position with a tooltip that points out that the user
 * has just been unsubscribed.
 */
function SwitchWithTooltip({
  label,
  onCheckedChange
}: {
  label: string;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <TooltipProvider>
      <Tooltip open>
        <TooltipTrigger asChild>
          <span>
            <Switch
              aria-label={label}
              checked={false}
              onCheckedChange={onCheckedChange}
            />
          </span>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          You have been unsubscribed.
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
