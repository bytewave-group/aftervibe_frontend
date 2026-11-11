/**
 * Offline / guest fallback when GET /api/customer/events is unavailable.
 * That endpoint requires a customer token, so the public home page uses this
 * list for guests.
 */

export interface EventItem {
  id: number;
  title: string;
  image: string;
  scheduleText: string | null;
  startsAt: string | null;
  endsAt: string | null;
  location: string | null;
  isHot: boolean;
}

export const EVENT_PLACEHOLDER_IMAGE = "/images/banner-dj-night.png";

export const mockEvents: EventItem[] = [
  {
    id: 1,
    title: "DJ NIGHT",
    image: EVENT_PLACEHOLDER_IMAGE,
    scheduleText: null,
    startsAt: "2026-11-14 21:00:00",
    endsAt: "2026-11-15 02:00:00",
    location: "Main Hall",
    isHot: true,
  },
  {
    id: 2,
    title: "Ladies Night",
    image: EVENT_PLACEHOLDER_IMAGE,
    scheduleText: "EVERY FRIDAY 9 - 11PM",
    startsAt: null,
    endsAt: null,
    location: null,
    isHot: true,
  },
  {
    id: 3,
    title: "Live Band",
    image: EVENT_PLACEHOLDER_IMAGE,
    scheduleText: null,
    startsAt: "2026-11-15 20:00:00",
    endsAt: "2026-11-15 23:00:00",
    location: null,
    isHot: false,
  },
];
