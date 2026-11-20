"use client";

import { useAuth } from "@/components/auth/AuthProvider";
import { CheckinHost } from "@/components/checkin/CheckinHost";
import { BannerCarousel } from "@/components/home/BannerCarousel";
import { EventList } from "@/components/home/EventList";
import { HomeMePane } from "@/components/home/HomeMePane";
import { Marquee } from "@/components/home/Marquee";
import { QuickActions } from "@/components/home/QuickActions";
import { RankingList } from "@/components/home/RankingList";
import { RankingsHost } from "@/components/home/RankingsHost";
import { TopBar } from "@/components/home/TopBar";
import { PageMain } from "@/components/layout/AppShell";
import { HomeTabs } from "@/components/layout/HomeTabs";
import { HomeBodySkeleton, HomeTopBarSkeleton } from "@/components/navigation/PageSkeletons";
import { useLocale, useTranslations } from "@/i18n/locale-provider";
import { loadEventsClient } from "@/lib/api/events-client";
import { loadHomeClient } from "@/lib/api/home-client";
import type { EventItem } from "@/lib/mock/events";
import type { HomeData } from "@/lib/mock/home";
import { useEffect, useState } from "react";

const HOME_LOAD_TIMEOUT_MS = 20000;

function HomeBody({
  home,
  events,
}: {
  home: HomeData;
  events: EventItem[];
}) {
  const t = useTranslations();
  const { locale } = useLocale();

  const banners = home.banners.map((banner) => ({
    ...banner,
    alt: t("home.bannerAlt"),
  }));
  const marqueeEmpty = t("home.marqueeEmpty");
  const marqueeName = (id: string) =>
    home.marqueeItems.find((item) => item.id === id)?.name || marqueeEmpty;
  const marqueeItems = [
    {
      id: "wealth-leader",
      label: t("home.marqueeWealth"),
      name: marqueeName("wealth-leader"),
      nameColor: "gold" as const,
    },
    {
      id: "charm-leader",
      label: t("home.marqueeCharm"),
      name: marqueeName("charm-leader"),
      nameColor: "pink" as const,
    },
  ];
  const quickActions = home.quickActions.map((action) => ({
    ...action,
    label: t(`home.actions.${action.id}`),
  }));
  const rankings = home.rankings.map((ranking) => ({
    ...ranking,
    title: t(`home.rankings.${ranking.id}`),
  }));
  const emptyRankings = t("home.rankings.empty");

  const rankingLists = (
    <div className="flex flex-col gap-[15px]">
      {rankings.map((ranking) => (
        <RankingList key={ranking.id} data={ranking} empty={emptyRankings} />
      ))}
    </div>
  );

  return (
    <div className="anim-content-fade">
      <BannerCarousel banners={banners} />
      <RankingsHost lists={rankingLists}>
        <Marquee prefix={t("home.marqueePrefix")} items={marqueeItems} />
      </RankingsHost>
      <CheckinHost>
        <QuickActions actions={quickActions} ariaLabel={t("home.quickActionsAria")} />
      </CheckinHost>
      <EventList
        events={events}
        title={t("home.events.title")}
        empty={t("home.events.empty")}
        hotLabel={t("home.events.hot")}
        locale={locale}
        cardAria={(event, schedule) =>
          t("home.events.cardAria", { title: event.title, schedule })
        }
      />
    </div>
  );
}

export function HomeScreen() {
  const { isAuthed } = useAuth();
  const t = useTranslations();
  const [home, setHome] = useState<HomeData | null>(null);
  const [events, setEvents] = useState<EventItem[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    // fetch() has no timeout: a request that never answers (flaky network,
    // blocker, proxy) would leave the skeleton up forever. Give up after
    // HOME_LOAD_TIMEOUT_MS and offer a reload instead.
    const stall = window.setTimeout(() => {
      if (!cancelled) setFailed(true);
    }, HOME_LOAD_TIMEOUT_MS);
    void Promise.all([loadHomeClient(), loadEventsClient()])
      .then(([nextHome, nextEvents]) => {
        if (cancelled) return;
        window.clearTimeout(stall);
        setFailed(false);
        setHome(nextHome);
        setEvents(nextEvents);
      })
      .catch(() => {
        window.clearTimeout(stall);
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
      window.clearTimeout(stall);
    };
  }, [isAuthed]);

  return (
    <HomeTabs
      home={
        failed && !(home && events) ? (
          <div className="flex flex-col items-center gap-4 px-6 pt-16 text-center">
            <p className="text-[16px] leading-snug font-bold text-white">{t("common.pageError")}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-full bg-[#d01f25] px-7 py-2 text-[15px] font-bold text-white"
            >
              {t("common.retry")}
            </button>
          </div>
        ) : (
          <>
            {home ? (
              <TopBar balance={home.balance} foodcourtCustomerId={home.foodcourtCustomerId} />
            ) : (
              <HomeTopBarSkeleton />
            )}
            <PageMain>
              {home && events ? <HomeBody home={home} events={events} /> : <HomeBodySkeleton />}
            </PageMain>
          </>
        )
      }
      profile={<HomeMePane />}
    />
  );
}
