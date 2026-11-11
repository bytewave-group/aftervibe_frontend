"use client";

import { useLocale } from "@/i18n/locale-provider";
import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/api/notifications";
import { formatRelativeTime } from "@/lib/format/datetime";
import type { NotificationItem, NotificationsData } from "@/lib/mock/notifications";
import { useState } from "react";

const TITLE_KEYS: Record<NonNullable<NotificationItem["titleKey"]>, string> = {
  welcome: "notificationsPage.items.welcomeTitle",
  gift: "notificationsPage.items.giftTitle",
  coins: "notificationsPage.items.coinsTitle",
  reward: "notificationsPage.items.rewardTitle",
  ladies: "notificationsPage.items.ladiesTitle",
};

const BODY_KEYS: Record<NonNullable<NotificationItem["bodyKey"]>, string> = {
  welcome: "notificationsPage.items.welcomeBody",
  gift: "notificationsPage.items.giftBody",
  coins: "notificationsPage.items.coinsBody",
  reward: "notificationsPage.items.rewardBody",
  ladies: "notificationsPage.items.ladiesBody",
};

const TYPE_BG: Record<NotificationItem["type"], string> = {
  announcement: "bg-[#d01f25]",
  gift_received: "bg-[#fd54b1]",
  coins_credited: "bg-[#fda565]",
  reward_redeemed: "bg-[#ba4df5]",
};

export function NotificationsPageClient({
  initialData,
}: {
  initialData: NotificationsData;
}) {
  const { locale, t } = useLocale();
  const [data, setData] = useState(initialData);

  const openItem = async (item: NotificationItem) => {
    if (item.readAt) {
      return;
    }
    try {
      setData(await markNotificationRead(data.items, item.id));
    } catch (error) {
      console.warn("[notifications] mark read failed", error);
    }
  };

  const markAll = async () => {
    if (data.unreadCount === 0) {
      return;
    }
    try {
      setData(await markAllNotificationsRead(data.items));
    } catch (error) {
      console.warn("[notifications] mark all read failed", error);
    }
  };

  return (
    <div className="px-6 pb-8">
      <div className="mt-4 flex items-center justify-between">
        <p className="text-[13px] leading-none text-white/70">
          {data.unreadCount > 0
            ? t("notificationsPage.unread", { n: data.unreadCount })
            : t("notificationsPage.allRead")}
        </p>
        {data.unreadCount > 0 ? (
          <button
            type="button"
            className="anim-press text-[13px] leading-none font-bold text-[#fda565]"
            onClick={() => void markAll()}
          >
            {t("notificationsPage.markAll")}
          </button>
        ) : null}
      </div>

      {data.items.length === 0 ? (
        <p className="py-10 text-center text-[13px] text-white/50">
          {t("notificationsPage.empty")}
        </p>
      ) : (
        <ul className="anim-stagger mt-4 flex flex-col gap-2">
          {data.items.map((item) => {
            const unread = !item.readAt;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => void openItem(item)}
                  className={`anim-press flex w-full items-start rounded-[12px] bg-[#242424] px-3 py-3 text-left transition-opacity duration-[var(--motion-base)] ease-[var(--ease-motion)] ${
                    unread ? "" : "opacity-60"
                  }`}
                >
                  <span
                    className={`mt-0.5 flex size-[36px] shrink-0 items-center justify-center rounded-full ${TYPE_BG[item.type]}`}
                  >
                    <span className="size-2 rounded-full bg-white" />
                  </span>
                  <span className="ml-3 min-w-0 flex-1">
                    <span className="block text-[14px] leading-snug font-bold text-white">
                      {item.titleKey ? t(TITLE_KEYS[item.titleKey]) : item.title}
                    </span>
                    <span className="mt-1 block text-[12px] leading-relaxed text-white/70">
                      {item.bodyKey ? t(BODY_KEYS[item.bodyKey]) : item.body}
                    </span>
                    <span className="mt-1.5 block text-[11px] leading-none text-white/40">
                      {formatRelativeTime(item.createdAt, locale, t)}
                    </span>
                  </span>
                  {unread ? (
                    <span className="mt-1.5 ml-2 size-2 shrink-0 rounded-full bg-[#d01f25]" />
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
