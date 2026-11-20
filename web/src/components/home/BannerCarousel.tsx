"use client";

import { useTranslations } from "@/i18n/locale-provider";
import { SafeImage } from "@/components/media/SafeImage";
import { PLACEHOLDER_BANNER } from "@/lib/api/images";
import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";

const INTERVAL_MS = 4000;
const SWIPE_THRESHOLD = 40;

interface Banner {
  id: string;
  image: string;
  alt: string;
}

interface BannerCarouselProps {
  banners: Banner[];
}

export function BannerCarousel({ banners }: BannerCarouselProps) {
  const t = useTranslations();
  const [index, setIndex] = useState(0);
  const startX = useRef<number | null>(null);
  const paused = useRef(false);
  const count = banners.length;

  const go = useCallback(
    (delta: number) => {
      if (count === 0) return;
      setIndex((current) => (current + delta + count) % count);
    },
    [count],
  );

  useEffect(() => {
    if (count <= 1) return;

    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (media.matches) return;

    const timer = window.setInterval(() => {
      if (!paused.current) go(1);
    }, INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [count, go]);

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    startX.current = event.clientX;
    paused.current = true;
  };

  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (startX.current != null) {
      const dx = event.clientX - startX.current;
      if (dx > SWIPE_THRESHOLD) go(-1);
      else if (dx < -SWIPE_THRESHOLD) go(1);
    }
    startX.current = null;
    paused.current = false;
  };

  const onPointerCancel = () => {
    startX.current = null;
    paused.current = false;
  };

  if (count === 0) return null;

  return (
    <section className="px-0" aria-roledescription="carousel" aria-label={t("home.bannerAria")}>
      <div
        className="relative aspect-[393/221] w-full touch-pan-y overflow-hidden rounded-[10px] shadow-[0px_2px_3.5px_0px_rgba(0,0,0,0.1)]"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onPointerLeave={onPointerCancel}
      >
        <div
          className="flex h-full transition-transform duration-[500ms] ease-[var(--ease-motion)] motion-reduce:transition-none"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {banners.map((banner, bannerIndex) => (
            <div key={banner.id} className="relative h-full w-full shrink-0">
              <SafeImage
                src={banner.image}
                alt={banner.alt}
                fill
                sizes="(max-width: 440px) 100vw, 393px"
                className="object-cover"
                priority={bannerIndex === 0}
                draggable={false}
                fallback={PLACEHOLDER_BANNER}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="mt-[15px] flex items-center justify-center gap-[6px]" role="tablist" aria-label={t("home.bannerPagesAria")}>
        {banners.map((banner, bannerIndex) => {
          const active = bannerIndex === index;
          return (
            <button
              key={banner.id}
              type="button"
              role="tab"
              aria-selected={active}
              aria-label={t("home.bannerSlideAria", { n: bannerIndex + 1 })}
              className="anim-press flex h-[6px] items-center justify-center"
              onClick={() => setIndex(bannerIndex)}
            >
              <span
                className={`block h-[6px] rounded-[50px] transition-[width,background-color] duration-[var(--motion-base)] ease-[var(--ease-motion)] motion-reduce:transition-none ${
                  active ? "w-[18px] bg-[#d01f25]" : "w-[6px] bg-white/40"
                }`}
              />
            </button>
          );
        })}
      </div>
    </section>
  );
}
