import { EventCard } from "@/components/home/EventCard";
import { formatEventSchedule } from "@/lib/events/schedule";
import type { EventItem } from "@/lib/mock/events";
import type { Locale } from "@/i18n/config";

interface EventListProps {
  events: EventItem[];
  title: string;
  empty: string;
  hotLabel: string;
  locale: Locale;
  cardAria: (event: EventItem, schedule: string) => string;
}

export function EventList({
  events,
  title,
  empty,
  hotLabel,
  locale,
  cardAria,
}: EventListProps) {
  return (
    <section className="mt-[20px] px-2" aria-labelledby="home-events-title">
      <h2 id="home-events-title" className="text-[16px] leading-none font-bold text-white">
        {title}
      </h2>

      {events.length === 0 ? (
        <p className="mt-[12px] text-[13px] leading-none text-white/50">{empty}</p>
      ) : (
        <ul className="anim-stagger mt-[12px] flex flex-col gap-[10px]">
          {events.map((event) => {
            const schedule = formatEventSchedule(event, locale);
            return (
              <li key={event.id}>
                <EventCard
                  event={event}
                  locale={locale}
                  hotLabel={hotLabel}
                  ariaLabel={cardAria(event, schedule)}
                />
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
