"use client";

import { AppDialog } from "@/components/ui/AppDialog";
import { SafeImage } from "@/components/media/SafeImage";
import { useTranslations } from "@/i18n/locale-provider";
import { redeemMallPackage } from "@/lib/api/mall";
import type { MallData, MallPackage } from "@/lib/mock/mall";
import { useState } from "react";

export function MallPageClient({ initialData }: { initialData: MallData }) {
  const t = useTranslations();
  const [data, setData] = useState(initialData);
  const [selected, setSelected] = useState<MallPackage | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [heldSelected, setHeldSelected] = useState(selected);
  if (selected && heldSelected !== selected) {
    setHeldSelected(selected);
  }
  const dialogItem = selected ?? heldSelected;

  const nameOf = (pkg: MallPackage) =>
    pkg.nameKey ? t(`mall.items.${pkg.nameKey}`) : pkg.name;

  const confirmRedeem = async () => {
    if (!selected || busy) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await redeemMallPackage(data, selected.id);
      setData((current) => ({
        ...current,
        points: result.points,
        packages: current.packages
          .map((item) =>
            item.id === selected.id && item.stock != null
              ? { ...item, stock: item.stock - 1 }
              : item,
          )
          .filter((item) => item.stock == null || item.stock > 0),
      }));
      setSelected(null);
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
      <section className="anim-fade-up relative mt-4 overflow-hidden rounded-[12px] bg-gradient-to-l from-[#fd54b1] to-[#fda565] px-5 py-4">
        <p className="text-[14px] leading-none font-bold text-white/90">
          {t("mall.myPoints")}
        </p>
        <p className="mt-2 text-[32px] leading-none font-bold text-white tabular-nums">
          {t("mall.pointsUnit", { n: data.points })}
        </p>
      </section>

      {message ? (
        <p className="mt-4 text-center text-[13px] font-bold text-[#fda565]" role="status">
          {message}
        </p>
      ) : null}

      {data.packages.length === 0 ? (
        <p className="py-10 text-center text-[13px] text-white/50">{t("mall.empty")}</p>
      ) : (
        <ul className="anim-stagger mt-5 grid grid-cols-2 gap-3">
          {data.packages.map((pkg) => {
            const notEnough = data.points < pkg.pointsRequired;
            return (
              <li key={pkg.id}>
                <button
                  type="button"
                  className="anim-press flex w-full flex-col items-center rounded-[12px] bg-[#242424] px-3 pt-3 pb-3 text-left"
                  onClick={() => {
                    setError(null);
                    setSelected(pkg);
                  }}
                >
                  <div className="relative size-[88px] overflow-hidden rounded-[10px] bg-[#3a3a3a]">
                    <SafeImage
                      src={pkg.image}
                      alt=""
                      fill
                      sizes="88px"
                      className="object-contain p-2"
                    />
                  </div>
                  <p className="mt-3 w-full truncate text-center text-[14px] leading-none font-bold text-white">
                    {nameOf(pkg)}
                  </p>
                  <p className="mt-2 text-[12px] leading-none font-bold text-[#fda565]">
                    {t("mall.pointsUnit", { n: pkg.pointsRequired })}
                  </p>
                  {pkg.stock != null ? (
                    <p className="mt-1 text-[11px] leading-none text-white/45">
                      {t("mall.stock", { n: pkg.stock })}
                    </p>
                  ) : null}
                  <span
                    className={`mt-3 flex h-[32px] w-full items-center justify-center rounded-[8px] text-[13px] leading-none font-bold ${
                      notEnough ? "bg-white/10 text-white/40" : "bg-[#d01f25] text-white"
                    }`}
                  >
                    {notEnough ? t("mall.notEnough") : t("mall.redeem")}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {dialogItem ? (
        <AppDialog
          open={selected !== null}
          title={t("mall.confirmTitle")}
          onClose={() => {
            if (!busy) {
              setSelected(null);
              setError(null);
            }
          }}
          footer={
            <div className="flex gap-3">
              <button
                type="button"
                disabled={busy}
                className="anim-press flex h-[44px] flex-1 items-center justify-center rounded-[10px] bg-white/10 text-[15px] font-bold text-white disabled:opacity-50"
                onClick={() => setSelected(null)}
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                disabled={busy || data.points < dialogItem.pointsRequired}
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
