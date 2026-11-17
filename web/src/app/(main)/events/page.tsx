"use client";

import { useAuthedPage } from "@/components/auth/useAuthedPage";
import { EventDetailView } from "@/components/events/EventDetailView";
import { PageMain } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { EventDetailBodySkeleton } from "@/components/navigation/PageSkeletons";
import { useTranslations } from "@/i18n/locale-provider";
import { getEvent } from "@/lib/api/events";
import type { EventDetail } from "@/lib/mock/event-detail";
import { notFound, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function positiveIntParam(value: string | null): number | null {
  if (!value || !/^[1-9]\d*$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function EventInner() {
  const ready = useAuthedPage();
  const t = useTranslations();
  const params = useSearchParams();
  const id = positiveIntParam(params.get("id"));
  const [event, setEvent] = useState<EventDetail | null | undefined>(undefined);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!ready || id == null) return;
    let cancelled = false;
    void getEvent(id)
      .then((next) => {
        if (!cancelled) setEvent(next);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [ready, id]);

  if (id == null) {
    notFound();
  }

  return (
    <>
      <PageHeader title={event?.title} titleKey="home.events.title" backHref="/" />
      <PageMain>
        {failed ? (
          <p className="px-6 pt-10 text-center text-[14px] text-white/60">{t("common.pageError")}</p>
        ) : event ? (
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
