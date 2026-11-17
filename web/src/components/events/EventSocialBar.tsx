"use client";

import { useRequireAuth } from "@/components/auth/useRequireAuth";
import Image from "next/image";
import { EventCommentsSheet } from "@/components/events/EventCommentsSheet";
import { useLocale } from "@/i18n/locale-provider";
import { toggleEventLikeAction } from "@/lib/api/event-social-actions";
import { formatDate } from "@/lib/format/datetime";
import type { EventDetail } from "@/lib/mock/event-detail";
import { useCallback, useRef, useState } from "react";

export function EventSocialBar({ event }: { event: EventDetail }) {
  const { locale, t } = useLocale();
  const requireAuth = useRequireAuth();
  const [liked, setLiked] = useState(event.likedByMe);
  const [likesCount, setLikesCount] = useState(event.likesCount);
  const [commentsCount, setCommentsCount] = useState(event.commentsCount);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetKey, setSheetKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const inflight = useRef(0);
  const dateLabel = formatDate(event.startsAt, locale);

  const onCountChange = useCallback((count: number) => {
    setCommentsCount(count);
  }, []);

  async function onToggleLike() {
    if (!requireAuth(`/events?id=${event.id}`)) {
      return;
    }
    const generation = ++inflight.current;
    const previousLiked = liked;
    const previousCount = likesCount;
    const nextLiked = !previousLiked;
    setLiked(nextLiked);
    setLikesCount(Math.max(0, previousCount + (nextLiked ? 1 : -1)));
    setError(null);
    const result = await toggleEventLikeAction(event.id);
    if (generation !== inflight.current) {
      return;
    }
    if (!result.ok) {
      setLiked(previousLiked);
      setLikesCount(previousCount);
      setError(result.message ?? t("eventDetail.actionFailed"));
      return;
    }
    setLiked(result.liked);
    setLikesCount(result.likesCount);
  }

  function onOpenComments() {
    setSheetKey((current) => current + 1);
    setSheetOpen(true);
  }

  return (
    <>
      <div className="mt-7 flex items-center gap-6">
        <button
          type="button"
          className="flex min-h-[44px] items-center gap-2 text-white"
          onClick={onOpenComments}
          aria-label={t("eventDetail.comments")}
        >
          <span className="text-[20px] leading-none tabular-nums">{commentsCount}</span>
          <Image
            src="/images/icon-event-comment.png"
            alt=""
            width={25}
            height={25}
            className="size-[25px] object-contain"
            aria-hidden
          />
        </button>
        <button
          type="button"
          className="flex min-h-[44px] items-center gap-2 text-white"
          onClick={() => void onToggleLike()}
          aria-label={t("eventDetail.likes")}
          aria-pressed={liked}
        >
          <span className="text-[20px] leading-none tabular-nums">{likesCount}</span>
          <Image
            src={liked ? "/images/icon-event-like-filled.svg" : "/images/icon-event-like.png"}
            alt=""
            width={28}
            height={25}
            className="h-[25px] w-[28px] object-contain"
            aria-hidden
          />
        </button>
      </div>
      {dateLabel ? <p className="mt-3 text-[12px] leading-none text-white/70">{dateLabel}</p> : null}
      {error ? <p className="mt-2 text-[12px] text-[#ff8a8a]">{error}</p> : null}
      <EventCommentsSheet
        key={sheetKey}
        eventId={event.id}
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onCountChange={onCountChange}
      />
    </>
  );
}
