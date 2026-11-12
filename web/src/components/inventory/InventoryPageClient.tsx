"use client";

import { SafeImage } from "@/components/media/SafeImage";
import { useLocale } from "@/i18n/locale-provider";
import { formatSlashDateRange } from "@/lib/format/datetime";
import type { InventoryData, InventoryItem } from "@/lib/mock/inventory";
import { useMemo, type ReactNode } from "react";

export function InventoryPageClient({ initialData }: { initialData: InventoryData }) {
  const { t } = useLocale();

  const itemName = (item: InventoryItem) =>
    item.nameKey ? t(`inventory.items.${item.nameKey}`) : (item.name || "");

  const inStock = useMemo(
    () => initialData.items.filter((item) => item.status === "active"),
    [initialData.items],
  );
  const usedUp = useMemo(
    () => initialData.items.filter((item) => item.status === "finished"),
    [initialData.items],
  );
  const expired = useMemo(
    () => initialData.items.filter((item) => item.status === "expired"),
    [initialData.items],
  );

  const sections = [
    { key: "inStock", title: t("inventory.inStock"), items: inStock, muted: false },
    { key: "usedUp", title: t("inventory.usedUp"), items: usedUp, muted: false },
    { key: "expired", title: t("inventory.expiredSection"), items: expired, muted: true },
  ];

  return (
    <div className="px-6 pb-8">
      {sections.map((section, index) => (
        <InventorySection
          key={section.key}
          title={section.title}
          className={index === 0 ? "mt-[36px]" : "mt-[25px]"}
        >
          {section.items.length === 0 ? (
            <p className="py-8 text-center text-[13px] text-white/50">
              {t("inventory.emptySection")}
            </p>
          ) : (
            <ul className="anim-stagger flex flex-col gap-2.5">
              {section.items.map((item) => (
                <InventoryCard
                  key={item.id}
                  item={item}
                  name={itemName(item)}
                  muted={section.muted}
                />
              ))}
            </ul>
          )}
        </InventorySection>
      ))}
    </div>
  );
}

function InventorySection({
  title,
  className = "mt-[36px]",
  children,
}: {
  title: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={className}>
      <h2 className="pl-[11px] text-[20px] leading-[23px] font-bold text-white">{title}</h2>
      <div className="mt-[15px] h-px w-full bg-[#565656]" />
      <div className="mt-[15px]">{children}</div>
    </section>
  );
}

function InventoryCard({
  item,
  name,
  muted,
}: {
  item: InventoryItem;
  name: string;
  muted: boolean;
}) {
  const { t } = useLocale();
  const range = formatSlashDateRange(item.storedAt, item.expiresAt);
  const nameColor = muted ? "text-[#565656]" : "text-white";
  const qtyColor = muted ? "text-[#565656]" : "text-white";
  const codeText = muted ? "text-[#1F1F1F]" : "text-white";

  return (
    <li className="relative flex h-[93px] items-center rounded-[10px] border border-[#565656] bg-[#1F1F1F] pr-6 pl-1.5">
      <div className="relative size-20 shrink-0 overflow-hidden rounded-[5px] bg-[#2a2a2a]">
        <SafeImage
          src={item.image}
          alt=""
          fill
          sizes="80px"
          className={`object-cover ${muted ? "grayscale brightness-[0.73]" : ""}`}
        />
      </div>
      <div className="ml-5 min-w-0 flex-1">
        <div className="flex items-center gap-[13px]">
          <p className={`truncate text-[14px] leading-4 font-bold ${nameColor}`}>{name}</p>
          {item.code ? (
            <span className="flex h-4 shrink-0 items-center rounded-full bg-[#565656] px-2 text-[10px] leading-[11px]">
              <span className={codeText}>{t("inventory.code", { code: item.code })}</span>
            </span>
          ) : null}
        </div>
        {range ? (
          <p className={`mt-2.5 truncate text-[10px] leading-[11px] ${nameColor}`}>{range}</p>
        ) : null}
      </div>
      <p className={`ml-3 shrink-0 text-[20px] leading-[23px] font-bold tabular-nums ${qtyColor}`}>
        {t("inventory.qtyShort", { n: item.remainingQty })}
      </p>
    </li>
  );
}
