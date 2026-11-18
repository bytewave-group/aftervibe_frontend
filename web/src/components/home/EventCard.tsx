"use client";

import { ForwardLink } from "@/components/navigation/ForwardLink";
import { SafeImage } from "@/components/media/SafeImage";
import { formatEventSchedule } from "@/lib/events/schedule";
import { EVENT_PLACEHOLDER_IMAGE, type EventItem } from "@/lib/mock/events";
import type { Locale } from "@/i18n/config";

interface EventCardProps {
  event: EventItem;
  locale: Locale;
  hotLabel: string;
  ariaLabel: string;
}

export function EventCard({ event, locale, hotLabel, ariaLabel }: EventCardProps) {
  const schedule = formatEventSchedule(event, locale);

  return (
    <ForwardLink
      href={`/events?id=${event.id}`}
      className="anim-press flex h-[88px] w-full items-center rounded-[12px] bg-[#242424] pr-[12px] pl-[8px] no-underline"
      aria-label={ariaLabel}
    >
      <div className="relative size-[72px] shrink-0 overflow-hidden rounded-[8px] bg-[#3a3a3a]">
        <SafeImage
          src={event.image}
          alt=""
          fill
          sizes="72px"
          className="object-cover"
          fallback={EVENT_PLACEHOLDER_IMAGE}
        />
      </div>

      <div className="ml-[12px] min-w-0 flex-1 text-left">
        <div className="flex items-center gap-2">
          <h3 className="min-w-0 flex-1 truncate text-[15px] leading-none font-bold text-white">
            {event.title}
          </h3>
          {event.isHot ? (
            <span className="anim-scale-in anim-glow shrink-0 rounded-[4px] bg-[#D01F25] px-[6px] py-[3px] text-[10px] leading-none font-bold text-white">
              {hotLabel}
            </span>
          ) : null}
        </div>
        {schedule ? (
          <p className="mt-[8px] truncate text-[12px] leading-none text-white/50">{schedule}</p>
        ) : null}
      </div>
    </ForwardLink>
  );
}
