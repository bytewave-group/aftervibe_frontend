import { EventDetailView } from "@/components/events/EventDetailView";
import { PageMain } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { EventDetailBodySkeleton } from "@/components/navigation/PageSkeletons";
import { getT } from "@/i18n/get-locale";
import { getEvent } from "@/lib/api/events";
import { cache, Suspense } from "react";
import { DevMockBadge } from "@/components/dev/DevMockBadge";

const loadEvent = cache(getEvent);

async function EventTitle({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const numericId = Number(id);
  const event = Number.isFinite(numericId) ? await loadEvent(numericId) : null;
  return <PageHeader title={event?.title} titleKey="home.events.title" backHref="/" />;
}

async function EventDetailContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const numericId = Number(id);
  const { t } = await getT();
  const event = Number.isFinite(numericId) ? await loadEvent(numericId) : null;

  return (
    <>
      <div className="anim-content-fade">
        {event ? (
          <EventDetailView event={event} />
        ) : (
          <p className="px-6 pt-10 text-center text-[14px] text-white/60">
            {t("eventDetail.notFound")}
          </p>
        )}
      </div>
      <DevMockBadge />
    </>
  );
}

export default function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <>
      <Suspense fallback={<PageHeader titleKey="home.events.title" backHref="/" />}>
        <EventTitle params={params} />
      </Suspense>
      <PageMain>
        <Suspense fallback={<EventDetailBodySkeleton />}>
          <EventDetailContent params={params} />
        </Suspense>
      </PageMain>
    </>
  );
}
