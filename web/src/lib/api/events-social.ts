import "server-only";

import { apiDelete, apiGet, apiPost } from "@/lib/api/server";
import type {
  EventCommentDto,
  EventCommentMutationResponse,
  EventCommentsResponse,
  EventLikeResponse,
} from "@/lib/api/types";

export type { EventCommentDto };

export async function loadEventComments(
  eventId: number,
  page = 1,
): Promise<EventCommentsResponse> {
  return apiGet<EventCommentsResponse>(
    `/api/customer/events/${eventId}/comments?page=${page}`,
    "optional",
  );
}

export async function toggleEventLike(eventId: number): Promise<EventLikeResponse> {
  return apiPost<EventLikeResponse>(`/api/customer/events/${eventId}/like`, {}, "required");
}

export async function postEventComment(
  eventId: number,
  body: string,
): Promise<EventCommentMutationResponse> {
  return apiPost<EventCommentMutationResponse>(
    `/api/customer/events/${eventId}/comments`,
    { body },
    "required",
  );
}

export async function deleteEventComment(
  eventId: number,
  commentId: number,
): Promise<EventCommentMutationResponse> {
  return apiDelete<EventCommentMutationResponse>(
    `/api/customer/events/${eventId}/comments/${commentId}`,
    "required",
  );
}
