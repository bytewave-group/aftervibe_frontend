import { apiFetch, ApiError, getStoredToken, onSessionChange } from "@/lib/api/browser";
import { displayImageUrl } from "@/lib/api/images";
import type { EventDto, EventsResponse } from "@/lib/api/types";
import { EVENT_PLACEHOLDER_IMAGE, type EventItem } from "@/lib/mock/events";

export const HOME_EVENT_LIMIT = 8;

function mapEvent(event: EventDto): EventItem {
  return {
    id: event.id,
    title: event.title,
    image: displayImageUrl(event.image_url, EVENT_PLACEHOLDER_IMAGE),
    scheduleText: event.schedule_text,
    startsAt: event.starts_at,
    endsAt: event.ends_at,
    location: event.location,
    isHot: Boolean(event.is_hot),
    likesCount: event.likes_count ?? 0,
    commentsCount: event.comments_count ?? 0,
    likedByMe: Boolean(event.liked_by_me),
  };
}

let eventsCache: { token: string | null; events: EventItem[] } | null = null;
let eventsPending: Promise<EventItem[]> | null = null;
let eventsPendingToken: string | null | undefined;

onSessionChange(() => {
  eventsCache = null;
  eventsPending = null;
  eventsPendingToken = undefined;
});

export async function loadEventsClient(): Promise<EventItem[]> {
  const token = getStoredToken();
  if (eventsCache && eventsCache.token === token) return eventsCache.events;
  if (eventsPending && eventsPendingToken === token) return eventsPending;

  eventsPendingToken = token;
  eventsPending = (async () => {
    try {
      const payload = await apiFetch<EventsResponse>("/api/customer/events", { auth: "optional" });
      const events = (payload.events ?? []).map(mapEvent).slice(0, HOME_EVENT_LIMIT);
      eventsCache = { token, events };
      return events;
    } catch (error) {
      console.warn(
        "[events] GET /api/customer/events failed",
        error instanceof ApiError ? { status: error.status, message: error.message } : error,
      );
      eventsCache = { token, events: [] };
      return [];
    } finally {
      if (eventsPendingToken === token) eventsPending = null;
    }
  })();
  return eventsPending;
}
