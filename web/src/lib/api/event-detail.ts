/**
 * Single event detail. Kept separate from src/lib/api/events.ts (list only).
 *
 * TODO: swap the mock fallback for a live call when desired:
 *   GET /api/customer/events/{id}  (auth required; published events only)
 *        → event { id, title, description, image_url, schedule_text,
 *                  starts_at, ends_at, location, is_hot }
 *
 * The list endpoint GET /api/customer/events is public; this detail
 * endpoint stays authenticated on the backend.
 */
import { displayImageUrl } from "@/lib/api/images";
import type { EventDto } from "@/lib/api/types";
import { findMockEventDetail, type EventDetail } from "@/lib/mock/event-detail";
import { EVENT_PLACEHOLDER_IMAGE } from "@/lib/mock/events";

export type { EventDetail };

function mapEvent(event: EventDto): EventDetail {
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
    description: event.description,
    descriptionKey: null,
  };
}

export function mapEventDetail(event: EventDto): EventDetail {
  return mapEvent(event);
}

export async function loadEventDetail(id: number): Promise<EventDetail | null> {
  // TODO: try apiGet<{ success: boolean; event: EventDto }>(`/api/customer/events/${id}`, "required")
  // and return mapEventDetail(payload.event). Fall back to the mock below on failure / 404.
  return findMockEventDetail(id);
}
