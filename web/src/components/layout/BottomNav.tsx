"use client";

import { GuardedLink } from "@/components/auth/GuardedLink";
import { useAuth } from "@/components/auth/AuthProvider";
import { useHomeTab, type HomeTab } from "@/components/layout/HomeTabProvider";
import { isModifiedClick } from "@/components/navigation/instant-nav";
import { useTranslations } from "@/i18n/locale-provider";
import Image from "next/image";
import { usePathname } from "next/navigation";

interface NavItem {
  href: string;
  tab?: HomeTab;
  labelKey: "nav.home" | "nav.gifts" | "nav.profile";
  icon?: { src: string; width: number; height: number };
}

const items: NavItem[] = [
  {
    href: "/",
    tab: "home",
    labelKey: "nav.home",
    icon: { src: "/images/icon-home.svg", width: 20, height: 21 },
  },
  {
    href: "/gifts",
    labelKey: "nav.gifts",
  },
  {
    href: "/?tab=me",
    tab: "me",
    labelKey: "nav.profile",
    icon: { src: "/images/icon-profile.svg", width: 22, height: 22 },
  },
];

export function BottomNav() {
  const pathname = usePathname();
  const t = useTranslations();
  const { isAuthed } = useAuth();
  const { tab, setTab } = useHomeTab();
  const onHome = pathname === "/";

  return (
    <nav
      className="pointer-events-none absolute inset-x-0 bottom-0 z-30 pb-[max(20px,env(safe-area-inset-bottom))]"
      aria-label={t("nav.aria")}
    >
      <div className="pointer-events-auto relative mx-6 h-[104px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/nav-bar.svg"
          alt=""
          width={394}
          height={72}
          className="absolute -bottom-px left-1/2 max-w-none -translate-x-1/2"
          style={{ width: "calc(100% + 2px)", height: "72px" }}
        />

        <GuardedLink
          href="/gifts"
          className={`anim-heart-pulse anim-press absolute top-0 left-1/2 z-10 -translate-x-1/2 transition-opacity duration-[var(--motion-base)] ease-[var(--ease-motion)] ${pathname === "/gifts" ? "opacity-100" : "opacity-70"}`}
          aria-label={t("nav.gifts")}
          aria-current={pathname === "/gifts" ? "page" : undefined}
        >
          <Image
            src="/images/nav-heart.png"
            alt=""
            width={65}
            height={65}
            className="size-[65px] object-contain"
            priority
          />
        </GuardedLink>

        <ul className="absolute bottom-0 left-0 grid h-[70px] w-full grid-cols-3">
          {items.map((item) => {
            const active =
              item.tab === "home"
                ? onHome && tab !== "me"
                : item.tab === "me"
                  ? onHome && tab === "me"
                  : pathname === item.href;

            const switchInPlace =
              onHome && item.tab && (item.tab === "home" || isAuthed);

            return (
              <li key={item.href} className="relative flex justify-center">
                <GuardedLink
                  href={item.href}
                  className={`anim-press flex h-full w-full flex-col items-center no-underline transition-opacity duration-[var(--motion-base)] ease-[var(--ease-motion)] ${active ? "opacity-100" : "opacity-70"}`}
                  aria-current={active ? "page" : undefined}
                  onClick={(event) => {
                    if (!switchInPlace || !item.tab || isModifiedClick(event)) {
                      return;
                    }
                    event.preventDefault();
                    setTab(item.tab);
                  }}
                >
                  {item.icon ? (
                    <span className="mt-[15px] flex h-[21px] items-center justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.icon.src}
                        alt=""
                        width={item.icon.width}
                        height={item.icon.height}
                      />
                    </span>
                  ) : (
                    <span className="mt-[15px] h-[21px]" />
                  )}
                  <span className="mt-[9px] text-[9px] leading-none font-bold text-white">
                    {t(item.labelKey)}
                  </span>
                </GuardedLink>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
