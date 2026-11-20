"use client";

import { GuardedLink } from "@/components/auth/GuardedLink";
import { useAuth } from "@/components/auth/AuthProvider";
import { useHomeTab, type HomeTab } from "@/components/layout/HomeTabProvider";
import { isModifiedClick } from "@/components/navigation/instant-nav";
import { useTranslations } from "@/i18n/locale-provider";
import Image from "next/image";
import { canonicalPath } from "@/components/navigation/nav-direction";
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

const BAR_FILL = "#170304";
const BAR_EDGE = "rgba(255,255,255,0.22)";
/** Bar height above the safe area; the raised heart adds 34px on top (BOTTOM_NAV_HEIGHT). */
const BAR_HEIGHT = 70;
/** Width of the dip under the heart (same curve as the old nav-bar.svg, never stretched). */
const NOTCH_WIDTH = 134.39;
const NOTCH_FILL = `M0 0H1C44.812 0 32.907 36 67.195 36C101.483 36 89.578 0 133.39 0H${NOTCH_WIDTH}V${BAR_HEIGHT}H0Z`;
const NOTCH_EDGE = "M0 0.5H1C44.812 0.5 32.907 36.5 67.195 36.5C101.483 36.5 89.578 0.5 133.39 0.5H134.39";

/**
 * Full-width bar docked to the bottom edge of the app column: flat top edge with the dip for the raised
 * heart, square corners, and the fill continuing down through env(safe-area-inset-bottom).
 */
export function BottomNavBarShape() {
  const side = `calc(50% - ${NOTCH_WIDTH / 2 - 1}px)`;
  return (
    <div className="pointer-events-auto absolute inset-x-0 bottom-0" aria-hidden="true">
      <div className="relative" style={{ height: BAR_HEIGHT }}>
        <div
          className="absolute top-0 bottom-0 left-0"
          style={{ width: side, background: BAR_FILL, borderTop: `1px solid ${BAR_EDGE}` }}
        />
        <svg
          className="absolute top-0 left-1/2 -translate-x-1/2"
          width={NOTCH_WIDTH}
          height={BAR_HEIGHT}
          viewBox={`0 0 ${NOTCH_WIDTH} ${BAR_HEIGHT}`}
          fill="none"
        >
          <path d={NOTCH_FILL} fill={BAR_FILL} />
          <path d={NOTCH_EDGE} stroke={BAR_EDGE} strokeWidth={1} />
        </svg>
        <div
          className="absolute top-0 right-0 bottom-0"
          style={{ width: side, background: BAR_FILL, borderTop: `1px solid ${BAR_EDGE}` }}
        />
      </div>
      <div style={{ height: "env(safe-area-inset-bottom)", background: BAR_FILL }} />
    </div>
  );
}

export function BottomNav() {
  const pathname = canonicalPath(usePathname() ?? "/");
  const t = useTranslations();
  const { isAuthed } = useAuth();
  const { tab, setTab } = useHomeTab();
  const onHome = pathname === "/";

  return (
    <nav
      className="pointer-events-none absolute inset-x-0 bottom-0 z-30 pb-[env(safe-area-inset-bottom)]"
      aria-label={t("nav.aria")}
    >
      <BottomNavBarShape />
      <div className="relative h-[104px]">

        <GuardedLink
          href="/gifts"
          className={`anim-heart-pulse anim-press pointer-events-auto absolute top-0 left-1/2 z-10 -translate-x-1/2 transition-opacity duration-[var(--motion-base)] ease-[var(--ease-motion)] ${pathname === "/gifts" ? "opacity-100" : "opacity-70"}`}
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

        <ul className="pointer-events-auto absolute bottom-0 left-0 grid h-[70px] w-full grid-cols-3">
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
