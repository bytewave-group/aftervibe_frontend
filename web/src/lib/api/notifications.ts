import {
  collectPages,
  logApiFallback,
  redirectIfUnauthorized,
  type LaravelPaginator,
} from "@/lib/api/paginate";
import { apiGet, apiPost, ApiError } from "@/lib/api/browser";
import type { CustomerNotificationDto } from "@/lib/api/types";
import {
  buildNotificationsData,
  mockNotifications,
  type NotificationItem,
  type NotificationType,
  type NotificationsData,
} from "@/lib/mock/notifications";
import { devMockIfEmpty, devMockOnError } from "@/lib/mock/devFallback";

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

/** `data.params` of a gift_received row (PlaylistService::chargeUnits), so the UI can localize it. */
function mapGiftParams(data: unknown): NotificationItem["giftParams"] {
  if (!data || typeof data !== "object") return null;
  const params = (data as { params?: unknown }).params;
  if (!params || typeof params !== "object") return null;
  const { sender, gift, quantity, points } = params as Record<string, unknown>;
  if (typeof sender !== "string" || typeof gift !== "string") return null;
  return {
    sender,
    gift,
    quantity: Math.max(1, Number(quantity) || 1),
    points: Math.max(0, Number(points) || 0),
  };
}

function mapNotification(row: CustomerNotificationDto): NotificationItem {
  const type = mapType(row.type);
  return {
    id: row.id,
    type,
    title: row.title || "",
    body: row.body || "",
    giftParams: type === "gift_received" ? mapGiftParams(row.data) : null,
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
    return buildNotificationsData(
      devMockIfEmpty("notifications", items, items.length === 0, () => structuredClone(mockNotifications)),
    );
  } catch (error) {
    redirectIfUnauthorized(error, "/notifications");
    logApiFallback("[notifications] GET /api/customer/notifications failed", error);
    return buildNotificationsData(
      devMockOnError("notifications", error, () => structuredClone(mockNotifications), () => []),
    );
  }
}

export async function markNotificationRead(
  items: NotificationItem[],
  id: number,
): Promise<NotificationsData> {
  try {
    await apiPost(`/api/customer/notifications/${id}/read`, {}, "required");
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
