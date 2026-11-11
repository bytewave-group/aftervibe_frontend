"use client";

import { PageHeader } from "@/components/layout/PageHeader";
import { useTranslations } from "@/i18n/locale-provider";
import type { ReactNode } from "react";

const PAGE_PAD = "pb-[max(20px,env(safe-area-inset-bottom))]";
const HOME_SCROLL_PAD =
  "pb-[calc(104px+max(20px,env(safe-area-inset-bottom))+24px)]";

export function Bone({ className = "" }: { className?: string }) {
  return (
    <div
      className={`anim-shimmer bg-white/10 ${className}`}
      aria-hidden="true"
    />
  );
}

function Main({
  homePad = false,
  children,
}: {
  homePad?: boolean;
  children: ReactNode;
}) {
  return (
    <main
      className={`relative z-10 min-h-0 flex-1 overflow-x-hidden overflow-y-auto ${
        homePad ? HOME_SCROLL_PAD : "pb-6"
      }`}
    >
      {children}
    </main>
  );
}

function Shell({
  children,
  withNavPad = false,
  framed = true,
}: {
  children: ReactNode;
  withNavPad?: boolean;
  framed?: boolean;
}) {
  if (!framed) {
    return (
      <div className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden">
        {children}
      </div>
    );
  }
  return (
    <div
      className={`relative flex h-full min-h-0 flex-1 flex-col overflow-hidden ${
        withNavPad ? "" : PAGE_PAD
      }`}
    >
      {children}
    </div>
  );
}

function BottomNavPlaceholder() {
  return (
    <div
      className="pointer-events-none absolute inset-x-0 bottom-0 z-30 pb-[max(20px,env(safe-area-inset-bottom))]"
      aria-hidden="true"
    >
      <div className="relative mx-6 h-[104px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/nav-bar.svg"
          alt=""
          width={394}
          height={72}
          className="absolute -bottom-px left-1/2 max-w-none -translate-x-1/2"
          style={{ width: "calc(100% + 2px)", height: "72px" }}
        />
      </div>
    </div>
  );
}

export function SpinBodySkeleton() {
  return (
    <div className="flex flex-col items-center px-6 pb-8">
      <Bone className="mt-6 size-[300px] rounded-full" />
      <Bone className="mt-8 h-[22px] w-[180px] rounded-full" />
      <Bone className="mt-6 h-[48px] w-[220px] rounded-full" />
    </div>
  );
}

export function MallBodySkeleton() {
  return (
    <div className="px-6 pb-8">
      <Bone className="mt-4 h-[20px] w-[120px] rounded-full" />
      <div className="mt-5 grid grid-cols-2 gap-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="overflow-hidden rounded-[12px] bg-[#242424] p-3">
            <Bone className="h-[96px] w-full rounded-[8px]" />
            <Bone className="mt-3 h-[14px] w-[80%] rounded-full" />
            <Bone className="mt-2 h-[12px] w-[50%] rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function InventoryBodySkeleton() {
  const t = useTranslations();
  return (
    <div className="px-6 pb-8">
      <div className="mt-4 flex gap-2">
        <div className="flex h-[34px] flex-1 items-center justify-center rounded-full bg-[#d01f25] text-[13px] font-bold text-white">
          {t("inventory.tabActive")}
        </div>
        <div className="flex h-[34px] flex-1 items-center justify-center rounded-full bg-white/10 text-[13px] font-bold text-white/70">
          {t("inventory.tabPast")}
        </div>
      </div>
      <ul className="mt-5 flex flex-col gap-3">
        {Array.from({ length: 4 }, (_, i) => (
          <li key={i} className="flex items-center rounded-[12px] bg-[#242424] px-3 py-3">
            <Bone className="size-[64px] shrink-0 rounded-[8px]" />
            <div className="ml-3 min-w-0 flex-1">
              <Bone className="h-[14px] w-[60%] rounded-full" />
              <Bone className="mt-2 h-[11px] w-[40%] rounded-full" />
              <Bone className="mt-2 h-[10px] w-[50%] rounded-full" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function EventDetailBodySkeleton() {
  return (
    <div className="px-6 pb-8">
      <Bone className="mt-4 h-[200px] w-full rounded-[12px]" />
      <Bone className="mt-5 h-[22px] w-[70%] rounded-full" />
      <Bone className="mt-3 h-[13px] w-[50%] rounded-full" />
      <Bone className="mt-2.5 h-[13px] w-[40%] rounded-full" />
      <Bone className="mt-5 h-[13px] w-full rounded-full" />
      <Bone className="mt-2 h-[13px] w-full rounded-full" />
      <Bone className="mt-2 h-[13px] w-[80%] rounded-full" />
    </div>
  );
}

export function HistoryBodySkeleton() {
  const t = useTranslations();
  return (
    <div className="px-6 pb-8">
      <div className="mt-4 flex gap-3">
        <div className="flex h-[40px] flex-1 items-center justify-center rounded-[8px] bg-[#c62828] text-[14px] font-bold text-white">
          {t("history.tabGift")}
        </div>
        <div className="flex h-[40px] flex-1 items-center justify-center rounded-[8px] border border-white/20 bg-[#140808] text-[14px] font-bold text-white">
          {t("history.tabRecharge")}
        </div>
      </div>
      <ul className="mt-5 flex flex-col gap-3">
        {Array.from({ length: 5 }, (_, i) => (
          <li
            key={i}
            className="flex items-center rounded-[12px] border border-white/20 bg-[#141010] py-3 pr-3 pl-4"
          >
            <div className="min-w-0 flex-1">
              <Bone className="h-[13px] w-[90%] rounded-full" />
              <Bone className="mt-2 h-[13px] w-[60%] rounded-full" />
            </div>
            <Bone className="ml-3 size-[56px] shrink-0 rounded-[8px]" />
          </li>
        ))}
      </ul>
    </div>
  );
}

export function EditProfileBodySkeleton() {
  return (
    <div className="px-6 pb-8">
      <div className="mt-6 flex flex-col items-center">
        <Bone className="size-[88px] rounded-full" />
        <Bone className="mt-6 h-[14px] w-[80px] rounded-full" />
      </div>
      <Bone className="mt-8 h-[14px] w-[60px] rounded-full" />
      <Bone className="mt-2 h-[44px] w-full rounded-[10px]" />
      <Bone className="mt-5 h-[14px] w-[60px] rounded-full" />
      <Bone className="mt-2 h-[44px] w-full rounded-[10px]" />
      <Bone className="mt-8 h-[48px] w-full rounded-[10px]" />
      <Bone className="mt-10 h-[16px] w-[80px] rounded-full" />
      <Bone className="mt-4 h-[44px] w-full rounded-[10px]" />
      <Bone className="mt-3 h-[44px] w-full rounded-[10px]" />
      <Bone className="mt-3 h-[44px] w-full rounded-[10px]" />
    </div>
  );
}

export function NotificationsBodySkeleton() {
  return (
    <div className="px-6 pb-8">
      <div className="mt-4 flex items-center justify-between">
        <Bone className="h-[13px] w-[80px] rounded-full" />
        <Bone className="h-[13px] w-[70px] rounded-full" />
      </div>
      <ul className="mt-5 flex flex-col gap-3">
        {Array.from({ length: 5 }, (_, i) => (
          <li key={i} className="flex items-start rounded-[12px] bg-[#242424] px-3 py-3">
            <Bone className="size-[40px] shrink-0 rounded-full" />
            <div className="ml-3 min-w-0 flex-1">
              <Bone className="h-[14px] w-[50%] rounded-full" />
              <Bone className="mt-2 h-[12px] w-full rounded-full" />
              <Bone className="mt-2 h-[11px] w-[30%] rounded-full" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function HomeBodySkeleton() {
  return (
    <div className="px-6">
      <Bone className="h-[140px] w-full rounded-[12px]" />
      <Bone className="mt-[15px] h-[28px] w-full rounded-full" />
      <div className="mt-[15px] flex items-start justify-between px-[18px]">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="flex flex-col items-center">
            <Bone className="size-[45px] rounded-full" />
            <Bone className="mt-[8px] h-[12px] w-[36px] rounded-full" />
          </div>
        ))}
      </div>
      <Bone className="mt-[20px] h-[16px] w-[64px] rounded-full" />
      <div className="mt-[12px] flex flex-col gap-[10px]">
        {Array.from({ length: 3 }, (_, i) => (
          <div
            key={i}
            className="flex h-[88px] items-center rounded-[12px] bg-[#242424] pr-[12px] pl-[8px]"
          >
            <Bone className="size-[72px] shrink-0 rounded-[8px]" />
            <div className="ml-[12px] min-w-0 flex-1">
              <Bone className="h-[15px] w-[70%] rounded-full" />
              <Bone className="mt-2 h-[12px] w-[50%] rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function HomeTopBarSkeleton() {
  return (
    <header className="relative z-20 px-6 pt-[8px] pb-[31px] [padding-top:max(8px,env(safe-area-inset-top))]">
      <div className="relative flex h-[49px] items-end justify-between">
        <Bone className="h-[30px] w-[88px] rounded-[50px]" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/logo-voxx.png"
          alt="VOXX"
          width={90}
          height={49}
          className="pointer-events-none absolute top-0 left-1/2 h-[49px] w-[90px] -translate-x-1/2 object-contain"
        />
        <div className="mb-[3px] flex items-center gap-[27px] pr-[10px]">
          <Bone className="size-[25px] rounded-[6px]" />
          <Bone className="h-[25px] w-[21px] rounded-[6px]" />
        </div>
      </div>
    </header>
  );
}

export function ProfileBodySkeleton() {
  return (
    <div>
      <section className="flex items-center px-6 pt-[28px]">
        <Bone className="size-[55px] shrink-0 rounded-full" />
        <div className="ml-[21px] min-w-0 flex-1">
          <Bone className="h-[16px] w-[40%] rounded-full" />
          <Bone className="mt-[8px] h-[14px] w-[30%] rounded-full" />
        </div>
      </section>
      <Bone className="mx-6 mt-[25px] h-[153px] rounded-[10px]" />
      <div className="mt-[30px] px-[41px]">
        <Bone className="h-[18px] w-[80px] rounded-full" />
        <div className="mt-[25px] flex flex-col gap-[20px]">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="flex items-center">
              <Bone className="size-[45px] shrink-0 rounded-full" />
              <Bone className="ml-[20px] h-[16px] w-[40%] rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function SpinSkeleton({ framed = true }: { framed?: boolean } = {}) {
  return (
    <Shell framed={framed}>
      <PageHeader titleKey="spin.title" backHref="/" />
      <Main>
        <SpinBodySkeleton />
      </Main>
    </Shell>
  );
}

export function MallSkeleton({ framed = true }: { framed?: boolean } = {}) {
  return (
    <Shell framed={framed}>
      <PageHeader titleKey="mall.title" backHref="/" />
      <Main>
        <MallBodySkeleton />
      </Main>
    </Shell>
  );
}

export function InventorySkeleton({ framed = true }: { framed?: boolean } = {}) {
  return (
    <Shell framed={framed}>
      <PageHeader titleKey="inventory.title" backHref="/" />
      <Main>
        <InventoryBodySkeleton />
      </Main>
    </Shell>
  );
}

export function EventDetailSkeleton({ framed = true }: { framed?: boolean } = {}) {
  return (
    <Shell framed={framed}>
      <PageHeader titleKey="home.events.title" backHref="/" />
      <Main>
        <EventDetailBodySkeleton />
      </Main>
    </Shell>
  );
}

export function HistorySkeleton({ framed = true }: { framed?: boolean } = {}) {
  return (
    <Shell framed={framed}>
      <PageHeader titleKey="history.title" backHref="/?tab=me" />
      <Main>
        <HistoryBodySkeleton />
      </Main>
    </Shell>
  );
}

export function EditProfileSkeleton({ framed = true }: { framed?: boolean } = {}) {
  return (
    <Shell framed={framed}>
      <PageHeader titleKey="profileEdit.title" backHref="/?tab=me" />
      <Main>
        <EditProfileBodySkeleton />
      </Main>
    </Shell>
  );
}

export function NotificationsSkeleton({ framed = true }: { framed?: boolean } = {}) {
  return (
    <Shell framed={framed}>
      <PageHeader titleKey="notificationsPage.title" backHref="/" />
      <Main>
        <NotificationsBodySkeleton />
      </Main>
    </Shell>
  );
}

export function HomeSkeleton({ withNav = false }: { withNav?: boolean }) {
  return (
    <Shell withNavPad={withNav}>
      <HomeTopBarSkeleton />
      <Main homePad>
        <HomeBodySkeleton />
      </Main>
      {withNav ? <BottomNavPlaceholder /> : null}
    </Shell>
  );
}

export function GenericPageSkeleton({ framed = true }: { framed?: boolean } = {}) {
  return (
    <Shell framed={framed}>
      <PageHeader title="" backHref="/" />
      <Main>
        <div className="px-6 pt-6">
          <Bone className="h-[20px] w-[50%] rounded-full" />
          <Bone className="mt-4 h-[120px] w-full rounded-[12px]" />
          <Bone className="mt-3 h-[14px] w-full rounded-full" />
          <Bone className="mt-2 h-[14px] w-[80%] rounded-full" />
        </div>
      </Main>
    </Shell>
  );
}


export function GiftStaffBodySkeleton() {
  return (
    <>
      <header className="relative z-20 px-6 pt-[16px] pb-[8px] [padding-top:max(16px,env(safe-area-inset-top))]">
        <div className="relative flex h-[32px] items-center">
          <Bone className="h-[24px] w-[14px] rounded-full" />
          <Bone className="mx-auto h-[20px] w-[96px] rounded-full" />
        </div>
        <Bone className="mt-3 h-[40px] w-full rounded-full" />
      </header>
      <div className="px-6 pt-4 pb-8">
        <Bone className="mb-3 h-[14px] w-[80px] rounded-full" />
        <div className="mb-6 grid grid-cols-4 gap-x-3">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="flex flex-col items-center">
              <Bone className="aspect-square w-full rounded-full" />
              <Bone className="mt-1.5 h-[10px] w-[70%] rounded-full" />
              <Bone className="mt-1 h-[8px] w-[50%] rounded-full" />
            </div>
          ))}
        </div>
        <Bone className="mb-3 h-[14px] w-[80px] rounded-full" />
        <div className="grid grid-cols-4 gap-x-3 gap-y-5">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="flex flex-col items-center">
              <Bone className="aspect-square w-full rounded-full" />
              <Bone className="mt-1.5 h-[10px] w-[70%] rounded-full" />
              <Bone className="mt-1 h-[8px] w-[50%] rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

export function GiftSelectBodySkeleton() {
  return (
    <>
      <header className="relative z-20 px-6 pt-[16px] pb-[8px] [padding-top:max(16px,env(safe-area-inset-top))]">
        <div className="relative flex h-[32px] items-center">
          <Bone className="h-[24px] w-[14px] rounded-full" />
          <Bone className="mx-auto h-[20px] w-[96px] rounded-full" />
          <Bone className="absolute right-0 h-[16px] w-[48px] rounded-full" />
        </div>
        <Bone className="mt-3 h-[40px] w-full rounded-full" />
      </header>
      <div className="px-6 pt-4 pb-8">
        <div className="mb-4 flex items-center gap-2">
          <Bone className="size-5 rounded-full" />
          <Bone className="h-[14px] w-[120px] rounded-full" />
          <Bone className="ml-auto h-[23px] w-[44px] rounded-full" />
        </div>
        <div className="grid grid-cols-4 gap-x-2.5 gap-y-4">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="rounded-[12px] bg-[#242424] px-1.5 pt-1.5 pb-2">
              <Bone className="aspect-square w-full rounded-[10px]" />
              <Bone className="mx-auto mt-1.5 h-[10px] w-[80%] rounded-full" />
              <Bone className="mx-auto mt-1 h-[8px] w-[40%] rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

export function GiftStaffSkeleton({ framed = true }: { framed?: boolean } = {}) {
  return (
    <Shell framed={framed}>
      <GiftStaffBodySkeleton />
    </Shell>
  );
}

export function GiftSelectSkeleton({ framed = true }: { framed?: boolean } = {}) {
  return (
    <Shell framed={framed}>
      <GiftSelectBodySkeleton />
    </Shell>
  );
}


export function RechargeBodySkeleton() {
  return (
    <>
      <header className="relative z-20 px-6 pt-[16px] pb-[8px] [padding-top:max(16px,env(safe-area-inset-top))]">
        <div className="relative flex h-[32px] items-center">
          <Bone className="h-[24px] w-[14px] rounded-full" />
          <Bone className="mx-auto h-[20px] w-[72px] rounded-full" />
          <Bone className="absolute right-0 h-[16px] w-[48px] rounded-full" />
        </div>
      </header>
      <div className="px-6 pt-4 pb-8">
        <Bone className="mb-3 h-[14px] w-[80px] rounded-full" />
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="flex flex-col items-center rounded-[14px] bg-[#242424] px-3 py-4">
              <Bone className="size-7 rounded-full" />
              <Bone className="mt-2 h-[20px] w-[48px] rounded-full" />
              <Bone className="mt-3 h-[28px] w-[64px] rounded-full" />
            </div>
          ))}
        </div>
        <Bone className="mt-6 h-[48px] w-full rounded-[12px]" />
      </div>
    </>
  );
}

export function RechargeSkeleton({ framed = true }: { framed?: boolean } = {}) {
  return (
    <Shell framed={framed}>
      <RechargeBodySkeleton />
    </Shell>
  );
}

export function skeletonForPath(pathname: string): ReactNode {
  if (pathname === "/") return <HomeSkeleton withNav />;
  if (pathname === "/spin") return <SpinSkeleton />;
  if (pathname === "/mall") return <MallSkeleton />;
  if (pathname === "/inventory") return <InventorySkeleton />;
  if (pathname === "/notifications") return <NotificationsSkeleton />;
  if (pathname === "/profile/history") return <HistorySkeleton />;
  if (pathname === "/profile/edit") return <EditProfileSkeleton />;
  if (pathname.startsWith("/events/")) return <EventDetailSkeleton />;
  if (pathname === "/gifts") return <GiftStaffSkeleton />;
  if (pathname.startsWith("/gifts/")) return <GiftSelectSkeleton />;
  if (pathname === "/recharge") return <RechargeSkeleton />;
  return <GenericPageSkeleton />;
}
