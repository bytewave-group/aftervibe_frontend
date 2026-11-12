import { BannerCarousel } from "@/components/home/BannerCarousel";
import { EventList } from "@/components/home/EventList";
import { Marquee } from "@/components/home/Marquee";
import { CheckinHost } from "@/components/checkin/CheckinHost";
import { QuickActions } from "@/components/home/QuickActions";
import { RankingList } from "@/components/home/RankingList";
import { RankingsHost } from "@/components/home/RankingsHost";
import { TopBar } from "@/components/home/TopBar";
import { PageMain } from "@/components/layout/AppShell";
import { HomeTabs } from "@/components/layout/HomeTabs";
import {
  HomeBodySkeleton,
  HomeTopBarSkeleton,
} from "@/components/navigation/PageSkeletons";
import { ProfilePanel } from "@/components/profile/ProfilePanel";
import { getT } from "@/i18n/get-locale";
import { loadEvents } from "@/lib/api/events";
import { loadHome } from "@/lib/api/home";
import { cache, Suspense } from "react";
import { DevMockBadge } from "@/components/dev/DevMockBadge";

const getHome = cache(loadHome);

async function HomeTopBar() {
  const { data } = await getHome();
  return (
    <TopBar
      balance={data.balance}
      foodcourtCustomerId={data.foodcourtCustomerId}
    />
  );
}

async function HomeBody() {
  const { locale, t } = await getT();
  const { data } = await getHome();
  const { events } = await loadEvents();

  const banners = data.banners.map((banner) => ({
    ...banner,
    alt: t("home.bannerAlt"),
  }));

  const marqueeItems = data.marqueeItems.map((item) => ({
    ...item,
    label: t(item.labelKey),
  }));

  const quickActions = data.quickActions.map((action) => ({
    ...action,
    label: t(`home.actions.${action.id}`),
  }));

  const rankings = data.rankings.map((ranking) => ({
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
    <>
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
      <DevMockBadge />
    </>
  );
}

function HomePane() {
  return (
    <>
      <Suspense fallback={<HomeTopBarSkeleton />}>
        <HomeTopBar />
      </Suspense>
      <PageMain>
        <Suspense fallback={<HomeBodySkeleton />}>
          <HomeBody />
        </Suspense>
      </PageMain>
    </>
  );
}

export default function Home() {
  return <HomeTabs home={<HomePane />} profile={<ProfilePanel showBack={false} />} />;
}
