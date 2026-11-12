"use server";

import { ApiError } from "@/lib/api/server";
import {
  deleteEventComment,
  loadEventComments,
  postEventComment,
  toggleEventLike,
} from "@/lib/api/events-social";
import type { EventCommentDto, EventCommentsPage } from "@/lib/api/types";
import { redirectToLogin } from "@/lib/auth/unauthorized";
import { devMockIfEmpty, devMockOnError } from "@/lib/mock/devFallback";
import { mockEventCommentsPage } from "@/lib/mock/event-detail";

export type EventLikeActionResult =
  | { ok: true; liked: boolean; likesCount: number }
  | { ok: false; reason: "error"; message?: string };

export type EventCommentsActionResult =
  | { ok: true; page: EventCommentsPage }
  | { ok: false; reason: "error"; message?: string };

export type EventCommentActionResult =
  | { ok: true; comment?: EventCommentDto; commentsCount: number }
  | { ok: false; reason: "error"; message?: string };

function handleAuth(error: unknown, eventId: number): void {
  if (error instanceof ApiError && error.status === 401) {
    redirectToLogin(`/events/${eventId}`);
  }
}

export async function loadEventCommentsAction(
  eventId: number,
  page = 1,
): Promise<EventCommentsActionResult> {
  try {
    const payload = await loadEventComments(eventId, page);
    const comments = devMockIfEmpty(
      "event.comments",
      payload.comments,
      page === 1 && (payload.comments?.data ?? []).length === 0,
      () => mockEventCommentsPage(eventId),
    );
    return { ok: true, page: comments };
  } catch (error) {
    handleAuth(error, eventId);
    console.error("Failed to load event comments", error);
    return devMockOnError<EventCommentsActionResult>(
      "event.comments",
      error,
      () => ({ ok: true, page: mockEventCommentsPage(eventId) }),
      () => ({
        ok: false,
        reason: "error",
        message: error instanceof ApiError ? error.message : undefined,
      }),
    );
  }
}

export async function toggleEventLikeAction(eventId: number): Promise<EventLikeActionResult> {
  try {
    const payload = await toggleEventLike(eventId);
    return { ok: true, liked: payload.liked, likesCount: payload.likes_count };
  } catch (error) {
    handleAuth(error, eventId);
    console.error("Failed to toggle event like", error);
    return {
      ok: false,
      reason: "error",
      message: error instanceof ApiError ? error.message : undefined,
    };
  }
}

export async function postEventCommentAction(
  eventId: number,
  body: string,
): Promise<EventCommentActionResult> {
  try {
    const payload = await postEventComment(eventId, body);
    return {
      ok: true,
      comment: payload.comment,
      commentsCount: payload.comments_count,
    };
  } catch (error) {
    handleAuth(error, eventId);
    console.error("Failed to post event comment", error);
    return {
      ok: false,
      reason: "error",
      message: error instanceof ApiError ? error.message : undefined,
    };
  }
}

export async function deleteEventCommentAction(
  eventId: number,
  commentId: number,
): Promise<EventCommentActionResult> {
  try {
    const payload = await deleteEventComment(eventId, commentId);
    return { ok: true, commentsCount: payload.comments_count };
  } catch (error) {
    handleAuth(error, eventId);
    console.error("Failed to delete event comment", error);
    return {
      ok: false,
      reason: "error",
      message: error instanceof ApiError ? error.message : undefined,
    };
  }
}
