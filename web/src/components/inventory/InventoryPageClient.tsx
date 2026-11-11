"use client";

import { SafeImage } from "@/components/media/SafeImage";
import { useLocale } from "@/i18n/locale-provider";
import { formatDate } from "@/lib/format/datetime";
import type { InventoryData, InventoryItem, InventoryStatus } from "@/lib/mock/inventory";
import { useMemo, useState } from "react";

type Tab = "active" | "past";

function statusClass(status: InventoryStatus): string {
  if (status === "active") {
    return "bg-[#d01f25] text-white";
  }
  if (status === "expired") {
    return "bg-white/15 text-white/70";
  }
  return "bg-white/10 text-white/55";
}

export function InventoryPageClient({ initialData }: { initialData: InventoryData }) {
  const { locale, t } = useLocale();
  const [tab, setTab] = useState<Tab>("active");

  const visible = useMemo(
    () =>
      initialData.items.filter((item) =>
        tab === "active" ? item.status === "active" : item.status !== "active",
      ),
    [initialData.items, tab],
  );

  const statusLabel = (status: InventoryStatus) => {
    if (status === "active") {
      return t("inventory.statusActive");
    }
    if (status === "expired") {
      return t("inventory.statusExpired");
    }
    return t("inventory.statusFinished");
  };

  const itemName = (item: InventoryItem) =>
    item.nameKey ? t(`inventory.items.${item.nameKey}`) : (item.name || "");

  return (
    <div className="px-6 pb-8">
      <div className="mt-4 flex gap-2">
        {(["active", "past"] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className={`anim-press h-[34px] flex-1 rounded-full text-[13px] leading-none font-bold transition-colors duration-[var(--motion-base)] ease-[var(--ease-motion)] motion-reduce:transition-none ${
              tab === value ? "bg-[#d01f25] text-white" : "bg-white/10 text-white/70"
            }`}
          >
            {value === "active" ? t("inventory.tabActive") : t("inventory.tabPast")}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="py-10 text-center text-[13px] text-white/50">
          {tab === "active" ? t("inventory.empty") : t("inventory.emptyPast")}
        </p>
      ) : (
        <ul className="anim-stagger mt-5 flex flex-col gap-3">
          {visible.map((item) => (
            <li
              key={item.id}
              className="flex items-center rounded-[12px] bg-[#242424] px-3 py-3"
            >
              <div className="relative size-[64px] shrink-0 overflow-hidden rounded-[8px] bg-[#3a3a3a]">
                <SafeImage
                  src={item.image}
                  alt=""
                  fill
                  sizes="64px"
                  className="object-contain p-1.5"
                />
              </div>
              <div className="ml-3 min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="min-w-0 flex-1 truncate text-[15px] leading-none font-bold text-white">
                    {itemName(item)}
                  </p>
                  <span
                    className={`shrink-0 rounded-[4px] px-[6px] py-[3px] text-[10px] leading-none font-bold ${statusClass(item.status)}`}
                  >
                    {statusLabel(item.status)}
                  </span>
                </div>
                <p className="mt-2 text-[12px] leading-none text-white/70">
                  {t("inventory.qty", {
                    remaining: item.remainingQty,
                    total: item.quantity,
                  })}
                </p>
                <p className="mt-1.5 truncate text-[11px] leading-none text-white/45">
                  {t("inventory.storedAt", { date: formatDate(item.storedAt, locale) })}
                  {item.branchName ? ` · ${item.branchName}` : ""}
                </p>
                {item.expiresAt ? (
                  <p className="mt-1.5 truncate text-[11px] leading-none text-white/45">
                    {t("inventory.expiresAt", { date: formatDate(item.expiresAt, locale) })}
                  </p>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
