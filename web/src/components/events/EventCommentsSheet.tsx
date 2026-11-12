"use client";

import { SafeImage } from "@/components/media/SafeImage";
import { usePresence } from "@/components/ui/usePresence";
import { useLocale } from "@/i18n/locale-provider";
import {
  deleteEventCommentAction,
  loadEventCommentsAction,
  postEventCommentAction,
} from "@/lib/api/event-social-actions";
import type { EventCommentDto } from "@/lib/api/types";
import { FIGMA_SHEET_BG } from "@/lib/figma-backgrounds";
import { formatRelativeTime } from "@/lib/format/datetime";
import { useEffect, useId, useState, useSyncExternalStore, type FormEvent } from "react";
import { createPortal } from "react-dom";

const COMMENT_MAX_LENGTH = 500;

function useIsClient() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

export function EventCommentsSheet({
  eventId,
  open,
  onClose,
  onCountChange,
}: {
  eventId: number;
  open: boolean;
  onClose: () => void;
  onCountChange: (count: number) => void;
}) {
  const titleId = useId();
  const isClient = useIsClient();
  const { locale, t } = useLocale();
  const { mounted, exiting } = usePresence(open);
  const [comments, setComments] = useState<EventCommentDto[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [sending, setSending] = useState(false);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    let cancelled = false;
    void loadEventCommentsAction(eventId, 1).then((result) => {
      if (cancelled) {
        return;
      }
      setLoading(false);
      if (!result.ok) {
        setError(result.message ?? t("eventDetail.actionFailed"));
        return;
      }
      setComments(result.page.data);
      setPage(result.page.current_page);
      setLastPage(result.page.last_page);
      onCountChange(result.page.total);
    });
    return () => {
      cancelled = true;
    };
  }, [open, eventId, t, onCountChange]);

  useEffect(() => {
    if (!mounted || exiting) {
      return;
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose, mounted, exiting]);

  async function loadMore() {
    if (loadingMore || page >= lastPage) {
      return;
    }
    setLoadingMore(true);
    const result = await loadEventCommentsAction(eventId, page + 1);
    setLoadingMore(false);
    if (!result.ok) {
      setError(result.message ?? t("eventDetail.actionFailed"));
      return;
    }
    setComments((current) => {
      const seen = new Set(current.map((item) => item.id));
      return [...current, ...result.page.data.filter((item) => !seen.has(item.id))];
    });
    setPage(result.page.current_page);
    setLastPage(result.page.last_page);
    onCountChange(result.page.total);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const text = body.trim();
    if (!text || sending) {
      return;
    }
    if (text.length > COMMENT_MAX_LENGTH) {
      setError(t("eventDetail.commentTooLong"));
      return;
    }
    setSending(true);
    setError(null);
    const result = await postEventCommentAction(eventId, text);
    setSending(false);
    if (!result.ok) {
      setError(result.message ?? t("eventDetail.actionFailed"));
      return;
    }
    const comment = result.comment;
    if (!comment) {
      setError(t("eventDetail.actionFailed"));
      return;
    }
    setBody("");
    setComments((current) => [comment, ...current]);
    onCountChange(result.commentsCount);
  }

  async function onDelete(commentId: number) {
    const snapshot = comments;
    setComments((current) => current.filter((item) => item.id !== commentId));
    const result = await deleteEventCommentAction(eventId, commentId);
    if (!result.ok) {
      setComments(snapshot);
      setError(result.message ?? t("eventDetail.actionFailed"));
      return;
    }
    onCountChange(result.commentsCount);
  }

  if (!mounted || !isClient) {
    return null;
  }

  return createPortal(
    <div
      className={`anim-backdrop fixed inset-0 z-50 flex items-end justify-center bg-black/75 ${exiting ? "is-exit" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={onClose}
    >
      <div
        className={`anim-sheet flex min-h-[50vh] max-h-[75vh] w-full max-w-[440px] flex-col overflow-hidden rounded-t-[16px] ${exiting ? "is-exit" : ""}`}
        style={{ background: FIGMA_SHEET_BG }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-4 pb-3">
          <h2 id={titleId} className="text-[18px] leading-none font-bold text-white">
            {t("eventDetail.comments")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-full text-[20px] text-white/70"
            aria-label={t("eventDetail.close")}
          >
            ×
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-3">
          {loading ? (
            <p className="py-8 text-center text-[13px] text-white/50">…</p>
          ) : comments.length === 0 ? (
            <p className="py-8 text-center text-[13px] text-white/50">{t("eventDetail.noComments")}</p>
          ) : (
            <ul className="space-y-4">
              {comments.map((comment) => (
                <li key={comment.id} className="flex gap-3">
                  <div className="relative size-9 shrink-0 overflow-hidden rounded-full bg-[#3a3a3a]">
                    {comment.customer.avatar_url ? (
                      <SafeImage
                        src={comment.customer.avatar_url}
                        alt=""
                        fill
                        sizes="36px"
                        className="object-cover"
                      />
                    ) : (
                      <span className="flex size-full items-center justify-center text-[12px] font-bold text-white/80">
                        {(comment.customer.name || "?").slice(0, 1)}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <p className="truncate text-[13px] font-bold text-white">{comment.customer.name}</p>
                      {comment.created_at ? (
                        <span className="shrink-0 text-[11px] text-white/45">
                          {formatRelativeTime(comment.created_at, locale, t)}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-[14px] leading-relaxed whitespace-pre-wrap text-white/85">
                      {comment.body}
                    </p>
                    {comment.mine ? (
                      <button
                        type="button"
                        className="mt-1 text-[12px] text-white/45"
                        onClick={() => void onDelete(comment.id)}
                      >
                        {t("eventDetail.deleteComment")}
                      </button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
          {page < lastPage ? (
            <button
              type="button"
              className="mt-4 w-full py-2 text-center text-[13px] text-white/70"
              onClick={() => void loadMore()}
              disabled={loadingMore}
            >
              {t("eventDetail.loadMore")}
            </button>
          ) : null}
        </div>

        <form className="border-t border-white/10 px-5 pt-3 pb-[max(12px,env(safe-area-inset-bottom))]" onSubmit={onSubmit}>
          {error ? <p className="mb-2 text-[12px] text-[#ff8a8a]">{error}</p> : null}
          <div className="flex items-end gap-2">
            <textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              maxLength={COMMENT_MAX_LENGTH}
              rows={2}
              placeholder={t("eventDetail.commentPlaceholder")}
              className="min-h-[40px] flex-1 resize-none rounded-[10px] bg-[#2a2a2a] px-3 py-2 text-[14px] text-white outline-none placeholder:text-white/35"
            />
            <button
              type="submit"
              disabled={sending || body.trim().length === 0}
              className="h-10 shrink-0 rounded-[10px] bg-[#d01f25] px-3 text-[13px] font-bold text-white disabled:opacity-40"
            >
              {t("eventDetail.postComment")}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
