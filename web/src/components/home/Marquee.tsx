"use client";

import { useRankings } from "@/components/home/RankingsHost";
import { useRequireAuth } from "@/components/auth/useRequireAuth";
import { useTranslations } from "@/i18n/locale-provider";
import { nameColorClass, type MarqueeItem } from "@/lib/mock/home";

interface TranslatedMarqueeItem {
  id: string;
  label: string;
  name: string;
  nameColor: MarqueeItem["nameColor"];
}

interface MarqueeProps {
  prefix: string;
  items: TranslatedMarqueeItem[];
}

function MarqueeSequence({ prefix, items }: MarqueeProps) {
  return (
    <span className="flex shrink-0 items-center px-8 text-[16px] leading-none font-bold whitespace-nowrap text-white">
      <span>{prefix}</span>
      {items.map((item, index) => (
        <span key={item.id} className="flex items-center">
          <span className="ml-1">{item.label}</span>
          <span className={`ml-1 ${nameColorClass[item.nameColor]}`}>{item.name}</span>
          {index < items.length - 1 ? <span className="mx-1">|</span> : null}
        </span>
      ))}
    </span>
  );
}

export function Marquee({ prefix, items }: MarqueeProps) {
  const t = useTranslations();
  const { openRankings } = useRankings();
  const requireAuth = useRequireAuth();
  const label = `${prefix} ${items.map((item) => `${item.label} ${item.name}`).join(" | ")}`;

  return (
    <button
      type="button"
      className="mt-[15px] h-[40px] w-full cursor-pointer overflow-hidden border-y border-[#565656] bg-[#1e1e1e] p-0 text-left shadow-[0px_2px_3.5px_0px_rgba(0,0,0,0.1)]"
      aria-label={`${t("home.rankings.openAria")}. ${label}`}
      onClick={() => {
        if (requireAuth("/?rankings=1")) {
          openRankings();
        }
      }}
    >
      <div className="flex h-full w-max items-center animate-home-marquee motion-reduce:animate-none">
        <MarqueeSequence prefix={prefix} items={items} />
        <MarqueeSequence prefix={prefix} items={items} />
        <MarqueeSequence prefix={prefix} items={items} />
      </div>
    </button>
  );
}
