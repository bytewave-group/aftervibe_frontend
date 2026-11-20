"use client";

import { GuardedLink } from "@/components/auth/GuardedLink";
import { LanguageDialog } from "@/components/ui/LanguageDialog";
import { useLocale } from "@/i18n/locale-provider";
import { useState } from "react";

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
  received: {
    src: "/images/icon-gift-received.svg",
    width: 22,
    height: 22,
    background: "bg-[#ba4df5]",
  },
  edit: {
    src: "/images/icon-edit.svg",
    width: 20,
    height: 20,
    background: "bg-[#fd54b1]",
  },
  language: {
    src: "/images/icon-language.svg",
    width: 25,
    height: 25,
    background: "bg-[#fda565]",
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

export function ProfileSettings() {
  const { locale, t, isPending } = useLocale();
  const [open, setOpen] = useState(false);

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
            href="/profile/received-gifts"
            className="flex items-center no-underline"
          >
            <RowIcon icon={icons.received} />
            <span className="ml-[20px] text-[16px] leading-none font-bold text-white">
              {t("profile.receivedGifts")}
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

        <li>
          <button
            type="button"
            className="anim-press flex w-full items-center bg-transparent p-0 text-left"
            disabled={isPending}
            onClick={() => setOpen(true)}
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
      </ul>
      <LanguageDialog open={open} onClose={() => setOpen(false)} />
    </section>
  );
}
