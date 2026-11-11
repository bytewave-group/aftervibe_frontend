/**
 * Static stand-in for in-app notifications.
 *
 * Maps to:
 *   GET  /api/customer/notifications
 *   GET  /api/customer/notifications/unread-count
 *   POST /api/customer/notifications/read-all
 *   POST /api/customer/notifications/{id}/read
 *
 * Types follow CustomerNotification: announcement, gift_received,
 * coins_credited, reward_redeemed.
 */

export type NotificationType =
  | "announcement"
  | "gift_received"
  | "coins_credited"
  | "reward_redeemed";

export interface NotificationItem {
  id: number;
  type: NotificationType;
  titleKey?: "welcome" | "gift" | "coins" | "reward" | "ladies";
  bodyKey?: "welcome" | "gift" | "coins" | "reward" | "ladies";
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationsData {
  unreadCount: number;
  items: NotificationItem[];
}

export const mockNotifications: NotificationItem[] = [
  {
    id: 5,
    type: "announcement",
    titleKey: "ladies",
    bodyKey: "ladies",
    title: "Ladies Night this Friday",
    body: "Free flow for ladies from 9 to 11 PM. See you on the floor.",
    readAt: null,
    createdAt: "2026-11-10 16:00:00",
  },
  {
    id: 4,
    type: "coins_credited",
    titleKey: "coins",
    bodyKey: "coins",
    title: "Coins credited",
    body: "You received 5 coins from today's check-in.",
    readAt: null,
    createdAt: "2026-11-10 10:05:00",
  },
  {
    id: 3,
    type: "reward_redeemed",
    titleKey: "reward",
    bodyKey: "reward",
    title: "Reward ready",
    body: "Your Free Beer voucher is waiting in inventory.",
    readAt: null,
    createdAt: "2026-11-09 19:20:00",
  },
  {
    id: 2,
    type: "gift_received",
    titleKey: "gift",
    bodyKey: "gift",
    title: "A gift arrived",
    body: "Someone sent you a gift on the floor last night.",
    readAt: "2026-11-09 12:00:00",
    createdAt: "2026-11-09 01:14:00",
  },
  {
    id: 1,
    type: "announcement",
    titleKey: "welcome",
    bodyKey: "welcome",
    title: "Welcome to VOXX",
    body: "Thanks for joining. Check in daily and spin the lucky wheel.",
    readAt: "2026-11-01 12:00:00",
    createdAt: "2026-11-01 09:00:00",
  },
];

export function buildNotificationsData(
  items: NotificationItem[] = mockNotifications,
): NotificationsData {
  return {
    unreadCount: items.filter((item) => !item.readAt).length,
    items,
  };
}
