"use client";

import { CountUp } from "@/components/ui/CountUp";
import { useTranslations } from "@/i18n/locale-provider";
import Image from "next/image";
import { ForwardLink } from "@/components/navigation/ForwardLink";
import { type CustomerTier, tierTheme } from "@/components/profile/tier";
import { useLoopAnimation } from "@/components/profile/useLoopAnimation";
import { useRef } from "react";

/** Shine sweep: crosses the card in the first ~35% of the loop, then rests. */
const SWEEP: Keyframe[] = [
  { transform: "translateX(-160%) skewX(-18deg)", offset: 0 },
  { transform: "translateX(460%) skewX(-18deg)", offset: 0.35 },
  { transform: "translateX(460%) skewX(-18deg)", offset: 1 },
];

export function BalanceCard({ balance, tier = null }: { balance: number; tier?: CustomerTier | null }) {
  const t = useTranslations();
  const theme = tier ? tierTheme(tier) : null;
  const sweepRef = useRef<HTMLSpanElement>(null);
  useLoopAnimation(sweepRef, SWEEP, theme?.isTop ? 3600 : 5200, Boolean(theme?.animated));

  return (
    <section
      className="anim-fade-up relative mx-6 mt-[25px] h-[153px] overflow-hidden rounded-[10px] [--stagger:1]"
      data-tier-level={tier ? tier.level : undefined}
    >
      {theme ? (
        <>
          <div className="absolute inset-0" style={{ background: theme.card }} />
          <div className="absolute inset-0" style={{ background: theme.pattern }} aria-hidden="true" />
        </>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-l from-[#fd54b1] to-[#fda565]" />
      )}
      <div
        className="pointer-events-none absolute top-[24.26%] left-[57.56%] h-[131.95%] w-[51.5%]"
        style={{ opacity: theme ? 0.75 : 0.56, isolation: "isolate" }}
      >
        <Image
          src="/images/diamond.png"
          alt=""
          fill
          sizes="202px"
          className="object-contain object-left-top"
          style={theme ? { filter: "grayscale(1) brightness(1.25) contrast(1.05)" } : undefined}
        />
        {theme ? (
          /* Recolour the faceted diamond to the tier colour, keeping its facets. */
          <div
            className="absolute inset-0"
            style={{
              background: theme.diamondTint,
              mixBlendMode: "color",
              WebkitMask: "url(/images/diamond.png) left top / contain no-repeat",
              mask: "url(/images/diamond.png) left top / contain no-repeat",
            }}
            aria-hidden="true"
          />
        ) : null}
      </div>
      {theme?.animated ? (
        <span
          ref={sweepRef}
          className="pointer-events-none absolute inset-y-0 left-0 w-1/4"
          style={{
            transform: "translateX(-160%) skewX(-18deg)",
            background:
              "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.22) 50%, rgba(255,255,255,0) 100%)",
          }}
          aria-hidden="true"
        />
      ) : null}

      <div className="relative z-10 px-[20px] pt-[19px]">
        <div className="flex items-start justify-between">
          <div className="flex min-w-0 items-center gap-2">
            <h2 className="text-[20px] leading-none font-bold text-white">
              {t("profile.balance")}
            </h2>
            {tier && theme ? (
              <span
                className="flex h-[22px] max-w-[130px] min-w-0 items-center gap-1 rounded-full px-2 text-[11px] leading-none font-bold"
                style={{
                  background: theme.badgeBg,
                  border: `1px solid ${theme.badgeBorder}`,
                  color: theme.badgeText,
                }}
              >
                {tier.iconUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={tier.iconUrl} alt="" width={14} height={14} className="object-contain" style={{ width: 14, height: 14 }} />
                ) : null}
                <span className="truncate">{tier.name}</span>
              </span>
            ) : null}
          </div>
          <ForwardLink
            href="/recharge"
            className={`anim-press relative flex h-[30px] w-[90px] shrink-0 items-center justify-center overflow-hidden rounded-[5px] text-[14px] leading-none font-bold text-white no-underline ${
              theme ? "" : "bg-gradient-to-l from-[rgba(253,84,177,0.2)] to-[rgba(253,165,101,0.2)]"
            }`}
          >
            {theme ? (
              <span
                className="absolute inset-0"
                style={{ background: theme.button, boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.22)", borderRadius: 5 }}
                aria-hidden="true"
              />
            ) : null}
            <span className="relative">{t("profile.recharge")}</span>
          </ForwardLink>
        </div>
        <p className="mt-[25px] text-[40px] leading-none font-bold text-white tabular-nums">
          <CountUp value={balance} decimals={2} />
        </p>
      </div>
    </section>
  );
}
