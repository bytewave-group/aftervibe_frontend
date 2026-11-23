"use client";

import { useAuth } from "@/components/auth/AuthProvider";
import { useRequireAuth } from "@/components/auth/useRequireAuth";
import { AppDialog } from "@/components/ui/AppDialog";
import { SafeImage } from "@/components/media/SafeImage";
import { useLocale } from "@/i18n/locale-provider";
import { redeemMallPackage } from "@/lib/api/mall";
import type { MallData, MallPackage, MallPackageType } from "@/lib/mock/mall";
import { formatInteger } from "@/lib/format/datetime";
import { useMemo, useState } from "react";

type MallTab = "all" | "drinks" | "goods";

const TABS: { id: MallTab; labelKey: "mall.tabAll" | "mall.tabDrinks" | "mall.tabGoods" }[] = [
  { id: "all", labelKey: "mall.tabAll" },
  { id: "drinks", labelKey: "mall.tabDrinks" },
  { id: "goods", labelKey: "mall.tabGoods" },
];

function isDrink(type: MallPackageType): boolean {
  return type === "free_drink";
}

function matchesTab(pkg: MallPackage, tab: MallTab): boolean {
  if (tab === "all") {
    return true;
  }
  if (tab === "drinks") {
    return isDrink(pkg.type);
  }
  return !isDrink(pkg.type);
}

function formatPoints(value: number): string {
  return formatInteger(value);
}

export function MallPageClient({ initialData }: { initialData: MallData }) {
  const { t } = useLocale();
  const { isAuthed, customer } = useAuth();
  const requireAuth = useRequireAuth();
  const [data, setData] = useState(initialData);
  const [pendingRedeem, setPendingRedeem] = useState<MallPackage | null>(null);
  const [tab, setTab] = useState<MallTab>("all");
  const [selected, setSelected] = useState<MallPackage | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [heldSelected, setHeldSelected] = useState(selected);
  if (selected && heldSelected !== selected) {
    setHeldSelected(selected);
  }
  const dialogItem = selected ?? heldSelected ?? (isAuthed ? pendingRedeem : null);
  const dialogOpen = selected !== null || (isAuthed && pendingRedeem !== null);
  const displayPoints =
    isAuthed
      ? (customer?.reward_points != null
          ? Number(customer.reward_points) || 0
          : data.points)
      : 0;

  const visible = useMemo(
    () => data.packages.filter((pkg) => matchesTab(pkg, tab)),
    [data.packages, tab],
  );

  const nameOf = (pkg: MallPackage) =>
    pkg.nameKey ? t(`mall.items.${pkg.nameKey}`) : pkg.name;

  const confirmRedeem = async () => {
    const target = selected ?? pendingRedeem;
    if (!target || busy) {
      return;
    }
    if (!requireAuth("/mall")) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await redeemMallPackage(data, target.id);
      setData((current) => ({
        ...current,
        points: result.points,
        packages: current.packages
          .map((item) =>
            item.id === target.id && item.stock != null
              ? { ...item, stock: item.stock - 1 }
              : item,
          )
          .filter((item) => item.stock == null || item.stock > 0),
      }));
      setSelected(null);
      setPendingRedeem(null);
      setMessage(t("mall.success"));
    } catch (err) {
      setError(
        err instanceof Error && err.message === "not_enough"
          ? t("mall.notEnough")
          : err instanceof Error && err.message
            ? err.message
            : t("mall.error"),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="px-6 pb-8">
      <section className="mt-[36px] flex h-[50px] items-center rounded-[10px] bg-[#1F1F1F] px-8">
        <p className="text-[12px] leading-[14px] text-white">{t("mall.remainingPoints")}</p>
        {isAuthed ? (
          <>
            <p className="ml-auto text-[24px] leading-none font-bold text-white tabular-nums">
              {formatPoints(displayPoints)}
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/mall-coin.webp"
              alt=""
              width={26}
              height={26}
              className="ml-5 size-[26px] shrink-0 object-contain"
            />
          </>
        ) : (
          <button
            type="button"
            className="anim-press ml-auto text-[14px] leading-none font-bold text-white/80 underline decoration-white/30 underline-offset-4"
            onClick={() => requireAuth("/mall")}
          >
            {t("mall.loginToSeePoints")}
          </button>
        )}
      </section>

      {message ? (
        <p className="mt-4 text-center text-[13px] font-bold text-[#fda565]" role="status">
          {message}
        </p>
      ) : null}

      <div className="mt-[25px] flex gap-4">
        {TABS.map((item) => {
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`anim-press h-[50px] flex-1 rounded-[5px] text-[16px] leading-[18px] font-bold text-white transition-colors duration-[var(--motion-base)] ease-[var(--ease-motion)] motion-reduce:transition-none ${
                active ? "bg-[#d01f25]" : "bg-[#1F1F1F]"
              }`}
            >
              {t(item.labelKey)}
            </button>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <p className="py-10 text-center text-[13px] text-white/50">{t("mall.empty")}</p>
      ) : (
        <ul className="anim-stagger mt-[25px] grid grid-cols-3 gap-x-4 gap-y-2.5">
          {visible.map((pkg) => (
            <li key={pkg.id}>
              <button
                type="button"
                className="anim-press flex w-full flex-col items-start text-left"
                onClick={() => {
                  if (!requireAuth("/mall")) {
                    setPendingRedeem(pkg);
                    return;
                  }
                  setPendingRedeem(null);
                  setError(null);
                  setSelected(pkg);
                }}
              >
                <div className="relative aspect-square w-full overflow-hidden rounded-[10px] bg-[#1F1F1F]">
                  <SafeImage
                    src={pkg.image}
                    alt=""
                    fill
                    sizes="120px"
                    className="object-cover"
                  />
                </div>
                <p className="mt-2.5 w-full truncate text-[16px] leading-[18px] font-bold text-white">
                  {nameOf(pkg)}
                </p>
                <p className="mt-[5px] text-[16px] leading-[18px] text-white">
                  {t("mall.pointsUnit", { n: pkg.pointsRequired })}
                </p>
              </button>
            </li>
          ))}
        </ul>
      )}

      {dialogItem ? (
        <AppDialog
          open={dialogOpen}
          title={t("mall.confirmTitle")}
          onClose={() => {
            if (!busy) {
              setSelected(null);
              setPendingRedeem(null);
              setError(null);
            }
          }}
          footer={
            <div className="flex gap-3">
              <button
                type="button"
                disabled={busy}
                className="anim-press flex h-[44px] flex-1 items-center justify-center rounded-[10px] bg-white/10 text-[15px] font-bold text-white disabled:opacity-50"
                onClick={() => {
                  setSelected(null);
                  setPendingRedeem(null);
                }}
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                disabled={busy || displayPoints < dialogItem.pointsRequired}
                className="anim-press anim-btn-shimmer flex h-[44px] flex-1 items-center justify-center rounded-[10px] bg-[#d01f25] text-[15px] font-bold text-white disabled:opacity-50"
                onClick={() => void confirmRedeem()}
              >
                {busy ? t("mall.redeeming") : t("common.confirm")}
              </button>
            </div>
          }
        >
          <p>
            {t("mall.confirmBody", {
              name: nameOf(dialogItem),
              points: dialogItem.pointsRequired,
            })}
          </p>
          <p className="mt-2 text-[13px] text-white/55">
            {dialogItem.descriptionKey
              ? t(`mall.itemDesc.${dialogItem.descriptionKey}`)
              : (dialogItem.description ?? "")}
          </p>
          {error ? (
            <p className="mt-3 text-[13px] font-bold text-[#f0454a]" role="alert">
              {error}
            </p>
          ) : null}
        </AppDialog>
      ) : null}
    </div>
  );
}
