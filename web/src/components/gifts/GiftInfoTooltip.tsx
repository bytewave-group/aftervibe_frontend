"use client";

import { InfoIcon } from "@/components/gifts/GiftIcons";
import { useTranslations } from "@/i18n/locale-provider";
import { useEffect, useId, useRef, useState } from "react";

export function GiftInfoTooltip() {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const tooltipId = useId();

  useEffect(() => {
    if (!open) {
      return;
    }
    const onPointer = (event: PointerEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("pointerdown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        className="anim-press flex size-5 items-center justify-center text-white/70"
        aria-label={t("gifts.infoAria")}
        aria-expanded={open}
        aria-controls={open ? tooltipId : undefined}
        onClick={() => setOpen((value) => !value)}
      >
        <InfoIcon />
      </button>
      {open ? (
        <div
          id={tooltipId}
          role="tooltip"
          className="absolute top-[calc(100%+8px)] left-1/2 z-30 w-[min(260px,calc(100vw-48px))] -translate-x-1/2 rounded-[10px] bg-[#2a1214] px-3 py-2.5 text-[12px] leading-relaxed text-white/85 shadow-[0_8px_24px_rgba(0,0,0,0.45)] ring-1 ring-white/15"
        >
          {t("gifts.confirmTooltip")}
        </div>
      ) : null}
    </div>
  );
}
