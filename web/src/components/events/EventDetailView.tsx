"use client";

import { EventSocialBar } from "@/components/events/EventSocialBar";
import { SafeImage } from "@/components/media/SafeImage";
import { useLocale } from "@/i18n/locale-provider";
import { formatEventSchedule } from "@/lib/events/schedule";
import type { EventDetail } from "@/lib/mock/event-detail";
import { EVENT_PLACEHOLDER_IMAGE } from "@/lib/mock/events";

export function EventDetailView({ event }: { event: EventDetail }) {
  const { locale, t } = useLocale();
  const schedule = formatEventSchedule(event, locale);
  const description = event.descriptionKey
    ? t(`eventDetail.descriptions.${event.descriptionKey}`)
    : event.description;

  return (
    <article className="anim-fade-up px-6 pb-8">
      <div className="relative mt-4 h-[200px] overflow-hidden rounded-[12px] bg-[#242424]">
        <SafeImage
          src={event.image}
          alt=""
          fill
          sizes="(max-width: 440px) 100vw, 440px"
          className="object-cover"
          fallback={EVENT_PLACEHOLDER_IMAGE}
          priority
        />
        {event.isHot ? (
          <span className="anim-scale-in anim-glow absolute top-3 right-3 rounded-[4px] bg-[#d01f25] px-[8px] py-[4px] text-[11px] leading-none font-bold text-white">
            {t("home.events.hot")}
          </span>
        ) : null}
      </div>

      <h2 className="mt-5 text-[22px] leading-tight font-bold text-white">{event.title}</h2>

      {schedule ? (
        <p className="mt-3 text-[13px] leading-none text-white/70">
          <span className="font-bold text-white/90">{t("eventDetail.time")} · </span>
          {schedule}
        </p>
      ) : null}

      {event.location ? (
        <p className="mt-2.5 text-[13px] leading-none text-white/70">
          <span className="font-bold text-white/90">{t("eventDetail.location")} · </span>
          {event.location}
        </p>
      ) : null}

      {description ? (
        <p className="mt-5 text-[14px] leading-relaxed whitespace-pre-line text-white/80">
          {description}
        </p>
      ) : null}

      <EventSocialBar event={event} />
    </article>
  );
}
