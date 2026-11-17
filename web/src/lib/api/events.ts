import { mapEventDetail } from "@/lib/api/event-detail";
import { displayImageUrl } from "@/lib/api/images";
import { logApiFallback, redirectIfUnauthorized } from "@/lib/api/paginate";
import { apiGet, ApiError } from "@/lib/api/browser";
import type { EventDto, EventShowResponse, EventsResponse } from "@/lib/api/types";
import { findMockEventDetail, type EventDetail } from "@/lib/mock/event-detail";
import {
  EVENT_PLACEHOLDER_IMAGE,
  mockEvents,
  type EventItem,
} from "@/lib/mock/events";
import { devMockIfEmpty, devMockOnError } from "@/lib/mock/devFallback";

export type EventsSource = "api" | "mock";

export interface LoadedEvents {
  events: EventItem[];
  source: EventsSource;
}

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

/**
 * GET /api/customer/events is public (token optional). Guests and logged-in
 * users get the same published list. Mock data is dev-only (src/lib/mock/devFallback.ts).
 */
export async function loadEvents(): Promise<LoadedEvents> {
  try {
    const payload = await apiGet<EventsResponse>("/api/customer/events", "optional");
    const events = (payload.events ?? []).map(mapEvent).slice(0, HOME_EVENT_LIMIT);
    return devMockIfEmpty<LoadedEvents>("events", { events, source: "api" }, events.length === 0, () => ({
      events: structuredClone(mockEvents.slice(0, HOME_EVENT_LIMIT)),
      source: "mock",
    }));
  } catch (error) {
    console.warn(
      "[events] GET /api/customer/events failed",
      error instanceof ApiError
        ? { status: error.status, message: error.message }
        : error,
    );
    return devMockOnError<LoadedEvents>(
      "events",
      error,
      () => ({ events: structuredClone(mockEvents.slice(0, HOME_EVENT_LIMIT)), source: "mock" }),
      () => ({ events: [], source: "api" }),
    );
  }
}

/**
 * GET /api/customer/events/{id} requires a customer token.
 * 404 returns null. Other failures return null (dev: the mock for that id, if any).
 */
export async function getEvent(id: number): Promise<EventDetail | null> {
  try {
    const payload = await apiGet<EventShowResponse>(
      `/api/customer/events/${id}`,
      "required",
    );
    if (!payload?.event) {
      return null;
    }
    return mapEventDetail(payload.event);
  } catch (error) {
    redirectIfUnauthorized(error, `/events?id=${id}`);
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }
    logApiFallback(
      `[events] GET /api/customer/events/${id} failed`,
      error,
    );
    return devMockOnError(`event ${id}`, error, () => findMockEventDetail(id), () => null);
  }
}
