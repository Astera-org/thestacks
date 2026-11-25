import { http } from "@/api/client";
import { PaginatedNotifications } from "@/types";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

export const DELIVERY_METHOD = {
  EMAIL: "EMAIL",
  IN_APP: "IN_APP"
} as const;

export type DeliveryMethod =
  (typeof DELIVERY_METHOD)[keyof typeof DELIVERY_METHOD];

export interface NotificationSetting {
  notification_type: string;
  notification_name: string;
  notification_description: string;
  is_subscribed_email: boolean;
  is_subscribed_in_app: boolean;
}
export interface UnsubscribeResponse {
  email?: string;
  error?: string;
  notification_name?: string;
  notification_type?: string;
  token_matches_auth_user?: boolean;
}

/* -------------------------------------------------------------------------- */
/* Functions                                                                  */
/* -------------------------------------------------------------------------- */

export async function getUserNotificationSettings(): Promise<
  NotificationSetting[]
> {
  const res = await http.get<NotificationSetting[]>(
    "/notifications/get_user_settings"
  );
  return res.data;
}

export async function unsubscribe(token: string): Promise<UnsubscribeResponse> {
  const res = await http.post<UnsubscribeResponse>(
    "/notifications/unsubscribe",
    { token }
  );
  return res.data;
}

export async function updateUserNotificationSetting(payload: {
  notification_type: string;
  delivery_method: DeliveryMethod;
  is_subscribed: boolean;
}): Promise<void> {
  await http.put("/notifications/update_user_setting", payload);
}

/* -------------------------------------------------------------------------- */
/* Feed                                                                       */
/* -------------------------------------------------------------------------- */

export async function getAllUserNotifications(params?: {
  page?: number;
  per_page?: number;
  state?: string;
}): Promise<PaginatedNotifications> {
  const response = await http.get<PaginatedNotifications>("/notifications", {
    params
  });
  return response.data;
}

export async function getNotificationTypes(): Promise<string[]> {
  const response = await http.get("/notifications/types");
  return response.data;
}

export async function deleteNotification(
  notificationId: number
): Promise<void> {
  await http.delete(`/notifications/${notificationId}`);
}

export async function deleteSelectedNotifications(
  notificationIds: number[]
): Promise<void> {
  await http.delete(`/notifications`, { data: { ids: notificationIds } });
}

export async function deleteAllNotifications(
  mostRecentNotificationId: number | undefined,
  state?: string
): Promise<void> {
  await http.delete(`/notifications`, {
    data: { all: true, state, mostRecentNotificationId }
  });
}

export async function markNotification(
  notificationId: number,
  seen: number
): Promise<void> {
  await http.patch(`/notifications/${notificationId}`, { seen });
}

export async function markSelectedNotifications(
  notificationIds: number[],
  seen: number
): Promise<void> {
  await http.patch(`/notifications`, { ids: notificationIds, seen });
}

export async function markAllNotifications(
  seen: number,
  mostRecentNotificationId: number | undefined,
  state?: string
): Promise<void> {
  await http.patch(`/notifications`, {
    all: true,
    seen,
    state,
    mostRecentNotificationId
  });
}
