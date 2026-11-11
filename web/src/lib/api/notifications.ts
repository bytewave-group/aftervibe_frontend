"use server";

import {
  collectPages,
  logApiFallback,
  redirectIfUnauthorized,
  type LaravelPaginator,
} from "@/lib/api/paginate";
import { apiGet, apiPost, ApiError } from "@/lib/api/server";
import type { CustomerNotificationDto } from "@/lib/api/types";
import {
  buildNotificationsData,
  mockNotifications,
  type NotificationItem,
  type NotificationType,
  type NotificationsData,
} from "@/lib/mock/notifications";
import { revalidatePath } from "next/cache";

export type { NotificationItem, NotificationsData };

const NOTIFICATION_TYPES: NotificationType[] = [
  "announcement",
  "gift_received",
  "coins_credited",
  "reward_redeemed",
];

function mapType(value: string | undefined): NotificationType {
  return NOTIFICATION_TYPES.includes(value as NotificationType)
    ? (value as NotificationType)
    : "announcement";
}

function mapNotification(row: CustomerNotificationDto): NotificationItem {
  return {
    id: row.id,
    type: mapType(row.type),
    title: row.title || "",
    body: row.body || "",
    readAt: row.read_at ?? null,
    createdAt: row.created_at || "",
  };
}

async function fetchAllNotifications(): Promise<NotificationItem[]> {
  const rows = await collectPages<CustomerNotificationDto>((page) =>
    apiGet<{
      success: boolean;
      unread_count: number;
      notifications: LaravelPaginator<CustomerNotificationDto>;
    }>(`/api/customer/notifications?page=${page}`, "required").then(
      (payload) => payload.notifications ?? { data: [] },
    ),
  );
  return rows.map(mapNotification);
}

export async function loadNotifications(): Promise<NotificationsData> {
  try {
    const items = await fetchAllNotifications();
    return buildNotificationsData(items);
  } catch (error) {
    redirectIfUnauthorized(error, "/notifications");
    logApiFallback(
      "[notifications] GET /api/customer/notifications failed; falling back to mock notifications",
      error,
    );
    return buildNotificationsData(structuredClone(mockNotifications));
  }
}

export async function markNotificationRead(
  items: NotificationItem[],
  id: number,
): Promise<NotificationsData> {
  try {
    await apiPost(`/api/customer/notifications/${id}/read`, {}, "required");
    revalidatePath("/notifications");
    const now = new Date().toISOString();
    const next = items.map((item) =>
      item.id === id && !item.readAt ? { ...item, readAt: now } : item,
    );
    return buildNotificationsData(next);
  } catch (error) {
    redirectIfUnauthorized(error, "/notifications");
    throw new Error(
      error instanceof ApiError
        ? error.message
        : "Unable to mark the notification as read.",
    );
  }
}

export async function markAllNotificationsRead(
  items: NotificationItem[],
): Promise<NotificationsData> {
  try {
    await apiPost("/api/customer/notifications/read-all", {}, "required");
    revalidatePath("/notifications");
    const now = new Date().toISOString();
    const next = items.map((item) =>
      item.readAt ? item : { ...item, readAt: now },
    );
    return buildNotificationsData(next);
  } catch (error) {
    redirectIfUnauthorized(error, "/notifications");
    throw new Error(
      error instanceof ApiError
        ? error.message
        : "Unable to mark notifications as read.",
    );
  }
}
