"use client";

import { useAuth } from "@/components/auth/AuthProvider";
import { useRequireAuth } from "@/components/auth/useRequireAuth";
import { ProfileQrButton } from "@/components/profile/ProfileQrButton";
import { useNavTrigger, usePrefetch } from "@/components/navigation/instant-nav";
import { NAV_FORWARD } from "@/components/navigation/nav-direction";
import { useNavDirection } from "@/components/navigation/NavDirectionProvider";
import { LanguageDialog } from "@/components/ui/LanguageDialog";
import { CountUp, parseBalanceValue } from "@/components/ui/CountUp";
import { useTranslations } from "@/i18n/locale-provider";
import Image from "next/image";
import { useState, type ReactNode } from "react";

interface TopBarProps {
  balance: string;
  foodcourtCustomerId: string | null;
}

function NavIconButton({
  href,
  className,
  ariaLabel,
  children,
}: {
  href: string;
  className: string;
  ariaLabel: string;
  children: ReactNode;
}) {
  const { isAuthed } = useAuth();
  const requireAuth = useRequireAuth();
  const { setNavDirection } = useNavDirection();
  const trigger = useNavTrigger(href, NAV_FORWARD, isAuthed);
  usePrefetch(href, isAuthed);

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      className={className}
      onPointerDown={trigger.onPointerDown}
      onClick={() => {
        if (!requireAuth(href)) return;
        setNavDirection(NAV_FORWARD);
        trigger.commit();
      }}
    >
      {children}
    </button>
  );
}

export function TopBar({ balance, foodcourtCustomerId }: TopBarProps) {
  const t = useTranslations();
  const parsedBalance = parseBalanceValue(balance);
  const [languageOpen, setLanguageOpen] = useState(false);

  return (
    <header className="relative z-20 px-2 pt-[8px] pb-[31px] [padding-top:max(8px,env(safe-area-inset-top))]">
      <div className="relative flex h-[49px] items-end justify-between">
        <NavIconButton
          href="/recharge"
          className="anim-press flex h-[30px] shrink-0 items-center gap-[6px] rounded-[50px] bg-black/20 pr-[12px] pl-[10px] ring-1 ring-white/20"
          ariaLabel={t("home.balanceAria", { balance })}
        >
          <Image
            src="/images/diamond.png"
            alt=""
            width={16}
            height={16}
            className="size-4 shrink-0"
          />
          <span className="text-[14px] leading-none font-bold whitespace-nowrap text-white">
            {parsedBalance ? (
              <CountUp
                value={parsedBalance.amount}
                format={(n) => n.toFixed(parsedBalance.decimals)}
              />
            ) : (
              balance
            )}
          </span>
          <span className="text-[14px] leading-none font-bold text-white">+</span>
        </NavIconButton>

        <Image
          src="/images/logo-voxx.png"
          alt="VOXX"
          width={90}
          height={49}
          className="pointer-events-none absolute top-0 left-1/2 h-[49px] w-[90px] -translate-x-1/2 object-contain"
          priority
        />

        <div className="mb-[3px] flex items-center gap-4 pr-[6px]">
          <ProfileQrButton
            customerId={foodcourtCustomerId}
            className="anim-press flex size-[25px] items-center justify-center"
            authTarget="/"
          />
          <NavIconButton
            href="/notifications"
            ariaLabel={t("common.notifications")}
            className="anim-press flex h-[25px] w-[21px] items-center justify-center"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/icon-bell.svg" alt="" width={21} height={25} />
          </NavIconButton>
          <button
            type="button"
            aria-label={t("home.languageAria")}
            className="anim-press flex size-[25px] items-center justify-center"
            onClick={() => setLanguageOpen(true)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/icon-language.svg" alt="" width={22} height={22} />
          </button>
        </div>
      </div>
      <LanguageDialog open={languageOpen} onClose={() => setLanguageOpen(false)} />
    </header>
  );
}
