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
  const marqueeItems = home.marqueeItems.map((item) => ({
    ...item,
    label: t(item.labelKey),
  }));
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
        {marqueeItems.length > 0 ? (
          <Marquee prefix={t("home.marqueePrefix")} items={marqueeItems} />
        ) : null}
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
  const [home, setHome] = useState<HomeData | null>(null);
  const [events, setEvents] = useState<EventItem[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([loadHomeClient(), loadEventsClient()]).then(([nextHome, nextEvents]) => {
      if (cancelled) return;
      setHome(nextHome);
      setEvents(nextEvents);
    });
    return () => {
      cancelled = true;
    };
  }, [isAuthed]);

  return (
    <HomeTabs
      home={
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
      }
      profile={<HomeMePane />}
    />
  );
}
