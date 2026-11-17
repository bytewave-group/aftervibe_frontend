"use client";

import { useAuthedPage } from "@/components/auth/useAuthedPage";
import { EventDetailView } from "@/components/events/EventDetailView";
import { PageMain } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { EventDetailBodySkeleton } from "@/components/navigation/PageSkeletons";
import { useTranslations } from "@/i18n/locale-provider";
import { getEvent } from "@/lib/api/events";
import type { EventDetail } from "@/lib/mock/event-detail";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function EventInner() {
  const ready = useAuthedPage();
  const t = useTranslations();
  const params = useSearchParams();
  const id = Number(params.get("id"));
  const [event, setEvent] = useState<EventDetail | null | undefined>(undefined);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    const request = Number.isFinite(id) ? getEvent(id) : Promise.resolve(null);
    void request.then((next) => {
      if (!cancelled) setEvent(next);
    });
    return () => {
      cancelled = true;
    };
  }, [ready, id]);

  return (
    <>
      <PageHeader title={event?.title} titleKey="home.events.title" backHref="/" />
      <PageMain>
        {event ? (
          <div className="anim-content-fade">
            <EventDetailView event={event} />
          </div>
        ) : event === null ? (
          <p className="px-6 pt-10 text-center text-[14px] text-white/60">{t("eventDetail.notFound")}</p>
        ) : (
          <EventDetailBodySkeleton />
        )}
      </PageMain>
    </>
  );
}

export default function EventDetailPage() {
  return (
    <Suspense
      fallback={
        <>
          <PageHeader titleKey="home.events.title" backHref="/" />
          <EventDetailBodySkeleton />
        </>
      }
    >
      <EventInner />
    </Suspense>
  );
}
