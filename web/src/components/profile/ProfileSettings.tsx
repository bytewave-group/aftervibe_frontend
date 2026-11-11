"use client";

import { nextLocale } from "@/i18n/config";
import { useLocale } from "@/i18n/locale-provider";
import type { ProfileData } from "@/lib/mock/profile";
import { GuardedLink } from "@/components/auth/GuardedLink";
import { useState } from "react";
import { ToggleSwitch } from "./ToggleSwitch";

interface MenuIcon {
  src: string;
  width: number;
  height: number;
  background: string;
}

const icons: Record<string, MenuIcon> = {
  history: {
    src: "/images/icon-history.svg",
    width: 20,
    height: 23,
    background: "bg-[#d01f25]",
  },
  edit: {
    src: "/images/icon-edit.svg",
    width: 20,
    height: 20,
    background: "bg-[#fd54b1]",
  },
  notifications: {
    src: "/images/icon-bell-menu.svg",
    width: 20,
    height: 25,
    background: "bg-[#00c7db]",
  },
  language: {
    src: "/images/icon-language.svg",
    width: 25,
    height: 25,
    background: "bg-[#fda565]",
  },
  giftConfirm: {
    src: "/images/icon-gift-confirm.png",
    width: 25,
    height: 25,
    background: "bg-[#ba4df5]",
  },
};

function RowIcon({ icon }: { icon: MenuIcon }) {
  return (
    <span
      className={`relative flex size-[45px] shrink-0 items-center justify-center rounded-full ${icon.background}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={icon.src} alt="" width={icon.width} height={icon.height} />
    </span>
  );
}

export function ProfileSettings({ profile }: { profile: ProfileData }) {
  const { locale, t, setLocale, isPending } = useLocale();
  const [notifications, setNotifications] = useState(
    profile.notificationsEnabled,
  );
  const [giftConfirm, setGiftConfirm] = useState(profile.giftConfirmEnabled);

  return (
    <section className="anim-fade-up mt-[30px] [--stagger:2]">
      <h2 className="px-[44px] text-[20px] leading-none font-bold text-white">
        {t("profile.other")}
      </h2>

      <ul className="anim-stagger mt-[25px] flex flex-col gap-[20px] px-[41px]">
        <li>
          <GuardedLink
            href="/profile/history"
            className="flex items-center no-underline"
          >
            <RowIcon icon={icons.history} />
            <span className="ml-[20px] text-[16px] leading-none font-bold text-white">
              {t("profile.history")}
            </span>
          </GuardedLink>
        </li>

        <li>
          <GuardedLink
            href="/profile/edit"
            className="flex items-center no-underline"
          >
            <RowIcon icon={icons.edit} />
            <span className="ml-[20px] text-[16px] leading-none font-bold text-white">
              {t("profile.editProfile")}
            </span>
          </GuardedLink>
        </li>

        <li className="flex items-center">
          <RowIcon icon={icons.notifications} />
          <span className="ml-[20px] flex-1 text-[16px] leading-none font-bold text-white">
            {t("profile.notifications")}
          </span>
          <ToggleSwitch
            checked={notifications}
            onChange={setNotifications}
            label={t("profile.notifications")}
          />
        </li>

        <li>
          <button
            type="button"
            className="anim-press flex w-full items-center bg-transparent p-0 text-left"
            disabled={isPending}
            onClick={() => setLocale(nextLocale(locale))}
          >
            <RowIcon icon={icons.language} />
            <span className="ml-[20px] flex-1 text-[16px] leading-none font-bold text-white">
              {t("profile.language")}
            </span>
            <span className="text-[16px] leading-none font-bold text-white">
              {t(`languages.${locale}`)}
            </span>
          </button>
        </li>

        <li className="flex items-center">
          <RowIcon icon={icons.giftConfirm} />
          <span className="ml-[20px] flex-1 text-[16px] leading-none font-bold text-white">
            {t("profile.giftConfirm")}
          </span>
          <ToggleSwitch
            checked={giftConfirm}
            onChange={setGiftConfirm}
            label={t("profile.giftConfirm")}
          />
        </li>
      </ul>
    </section>
  );
}
