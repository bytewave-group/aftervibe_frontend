import { mapEventDetail } from "@/lib/api/event-detail";
import { displayImageUrl } from "@/lib/api/images";
import { logApiFallback, redirectIfUnauthorized } from "@/lib/api/paginate";
import { apiGet, ApiError } from "@/lib/api/server";
import type { EventDto, EventShowResponse, EventsResponse } from "@/lib/api/types";
import { findMockEventDetail, type EventDetail } from "@/lib/mock/event-detail";
import {
  EVENT_PLACEHOLDER_IMAGE,
  mockEvents,
  type EventItem,
} from "@/lib/mock/events";

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
  };
}

/**
 * GET /api/customer/events is public (token optional). Guests and logged-in
 * users get the same published list. Mock data is used only when the request fails.
 */
export async function loadEvents(): Promise<LoadedEvents> {
  try {
    const payload = await apiGet<EventsResponse>("/api/customer/events", "optional");
    const events = (payload.events ?? []).map(mapEvent).slice(0, HOME_EVENT_LIMIT);
    return { events, source: "api" };
  } catch (error) {
    console.warn(
      "[events] GET /api/customer/events failed; falling back to mock events",
      error instanceof ApiError
        ? { status: error.status, message: error.message }
        : error,
    );
    return { events: mockEvents.slice(0, HOME_EVENT_LIMIT), source: "mock" };
  }
}

/**
 * GET /api/customer/events/{id} requires a customer token.
 * 404 returns null. Other failures fall back to the mock for that id, if any.
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
    redirectIfUnauthorized(error, `/events/${id}`);
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }
    logApiFallback(
      `[events] GET /api/customer/events/${id} failed; falling back to mock event detail`,
      error,
    );
    return findMockEventDetail(id);
  }
}
