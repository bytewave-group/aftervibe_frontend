import { apiFetch, ApiError } from "@/lib/api/browser";
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

export async function loadEventsClient(): Promise<EventItem[]> {
  try {
    const payload = await apiFetch<EventsResponse>("/api/customer/events", { auth: "optional" });
    return (payload.events ?? []).map(mapEvent).slice(0, HOME_EVENT_LIMIT);
  } catch (error) {
    console.warn(
      "[events] GET /api/customer/events failed",
      error instanceof ApiError ? { status: error.status, message: error.message } : error,
    );
    return [];
  }
}
