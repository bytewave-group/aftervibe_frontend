"use client";

import { GiftDialog, GiftDialogButtons } from "@/components/gifts/GiftDialog";
import { ShieldIcon } from "@/components/gifts/GiftIcons";
import { DiamondBalance, GiftFlowHeader } from "@/components/gifts/GiftFlowHeader";
import { GiftInfoTooltip } from "@/components/gifts/GiftInfoTooltip";
import { GiftSearchBar } from "@/components/gifts/GiftSearchBar";
import { rememberRecentStaff, useConfirmToggle } from "@/components/gifts/recent";
import { PageMain } from "@/components/layout/AppShell";
import { useInstantNav } from "@/components/navigation/instant-nav";
import { NAV_FORWARD } from "@/components/navigation/nav-direction";
import { ToggleSwitch } from "@/components/profile/ToggleSwitch";
import { useTranslations } from "@/i18n/locale-provider";
import { sendGiftAction } from "@/lib/api/gifts";
import {
  CONFIRM_THRESHOLD,
  GIFT_PLACEHOLDER_IMAGE,
  type GiftBalance,
  type GiftItem,
  type GiftStaff,
} from "@/lib/mock/gifts";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";

function needsConfirm(
  gift: GiftItem,
  toggleOn: boolean,
  threshold: number,
): boolean {
  if (!toggleOn) {
    return false;
  }
  if (gift.requiresConfirmation) {
    return true;
  }
  return gift.price >= threshold;
}

export function GiftSelectClient({
  staff,
  gifts,
  balance: initialBalance,
  confirmThreshold = CONFIRM_THRESHOLD,
}: {
  staff: GiftStaff | null;
  gifts: GiftItem[];
  balance: GiftBalance;
  confirmThreshold?: number;
}) {
  const t = useTranslations();
  const { begin } = useInstantNav();
  const [query, setQuery] = useState("");
  const [armedId, setArmedId] = useState<number | null>(null);
  const armedIdRef = useRef<number | null>(null);
  const armTimerRef = useRef<number | null>(null);
  const [toggleOn, setToggleOn] = useConfirmToggle(true);
  const [balance, setBalance] = useState(initialBalance);
  const [confirmGift, setConfirmGift] = useState<GiftItem | null>(null);
  const [shortGift, setShortGift] = useState<{ gift: GiftItem; shortfall: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (staff) {
      rememberRecentStaff(staff);
    }
  }, [staff]);

  const clearArmTimer = useCallback(() => {
    if (armTimerRef.current != null) {
      window.clearTimeout(armTimerRef.current);
      armTimerRef.current = null;
    }
  }, []);

  const disarm = useCallback(() => {
    clearArmTimer();
    armedIdRef.current = null;
    setArmedId(null);
  }, [clearArmTimer]);

  const arm = useCallback(
    (id: number) => {
      armedIdRef.current = id;
      setArmedId(id);
      clearArmTimer();
      armTimerRef.current = window.setTimeout(() => {
        armedIdRef.current = null;
        setArmedId(null);
        armTimerRef.current = null;
      }, 3000);
    },
    [clearArmTimer],
  );

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (armedIdRef.current == null) return;
      const target = event.target as Element | null;
      if (target?.closest("[data-gift-tile]") || target?.closest("[role=dialog]")) {
        return;
      }
      disarm();
    };
    window.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      clearArmTimer();
    };
  }, [clearArmTimer, disarm]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return gifts;
    return gifts.filter((item) => item.name.toLowerCase().includes(q));
  }, [gifts, query]);

  const trySend = (gift: GiftItem) => {
    if (!staff) return;
    setError(null);
    setSuccess(null);

    if (balance.available < gift.price) {
      setConfirmGift(null);
      setShortGift({
        gift,
        shortfall: Math.max(1, gift.price - balance.available),
      });
      return;
    }

    if (needsConfirm(gift, toggleOn, confirmThreshold) && confirmGift?.interactionId !== gift.interactionId) {
      setConfirmGift(gift);
      return;
    }

    startTransition(async () => {
      const result = await sendGiftAction({
        staffId: staff.id,
        displayId: gift.displayId,
        interactionId: gift.interactionId,
        price: gift.price,
      });
      if (result.ok) {
        setBalance((prev) => ({
          ...prev,
          balance: result.balance,
          available: result.available,
        }));
        setConfirmGift(null);
        disarm();
        setSuccess(t("gifts.sent"));
        return;
      }
      if (result.reason === "insufficient") {
        setConfirmGift(null);
        setBalance((prev) => ({
          ...prev,
          balance: result.balance,
          available: result.available,
        }));
        setShortGift({ gift, shortfall: result.shortfall });
        return;
      }
      setError(result.message || t("gifts.errorGeneric"));
    });
  };

  const onSelectGift = (gift: GiftItem) => {
    setSuccess(null);
    if (armedIdRef.current === gift.interactionId) {
      clearArmTimer();
      trySend(gift);
      return;
    }
    arm(gift.interactionId);
  };

  const goRecharge = () => {
    const params = new URLSearchParams();
    if (shortGift) {
      params.set("shortfall", String(shortGift.shortfall));
    }
    params.set("from", staff ? `/gifts/${staff.id}` : "/gifts");
    begin(`/recharge?${params.toString()}`, NAV_FORWARD);
  };

  return (
    <div
      className="flex min-h-0 flex-1 flex-col"
      style={{
        backgroundImage:
          "linear-gradient(180deg, #1e1e1e 0%, #1e1e1e 45%, #6b1519 100%)",
      }}
    >
      <GiftFlowHeader
        titleKey="gifts.giftTitle"
        backHref="/gifts"
        right={<DiamondBalance amount={balance.available} />}
      >
        <GiftSearchBar
          value={query}
          onChange={setQuery}
          placeholder={t("gifts.searchGift")}
        />
      </GiftFlowHeader>
      <PageMain>
        <div className="px-6 pt-4 pb-4">
          <div className="mb-4 flex items-center gap-2">
            <span className="text-white">
              <ShieldIcon />
            </span>
            <p className="text-[14px] font-bold text-white">{t("gifts.confirmRequest")}</p>
            <GiftInfoTooltip />
            <span className="ml-auto">
              <ToggleSwitch
                checked={toggleOn}
                onChange={setToggleOn}
                label={t("gifts.confirmRequest")}
              />
            </span>
          </div>

          {!staff ? (
            <p className="py-10 text-center text-[13px] text-white/50">
              {t("gifts.staffMissing")}
            </p>
          ) : filtered.length === 0 ? (
            <p className="py-10 text-center text-[13px] text-white/50">
              {t("gifts.emptyGifts")}
            </p>
          ) : (
            <div className="grid grid-cols-4 gap-x-2.5 gap-y-4">
              {filtered.map((gift) => {
                const isArmed = armedId === gift.interactionId;
                return (
                  <button
                    key={`${gift.displayId}-${gift.interactionId}`}
                    type="button"
                    data-gift-tile=""
                    disabled={pending}
                    onClick={() => onSelectGift(gift)}
                    className={`anim-press flex flex-col items-center rounded-[12px] px-1.5 pt-1.5 pb-2 ${
                      isArmed
                        ? "ring-2 ring-[#D01F25] bg-[#d01f25]/10"
                        : "bg-white/5"
                    }`}
                  >
                    <span className="relative mb-1.5 block aspect-square w-full overflow-hidden rounded-[10px]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={gift.image || GIFT_PLACEHOLDER_IMAGE}
                        alt=""
                        className="size-full object-contain"
                      />
                      {isArmed ? (
                        <span className="absolute inset-0 flex items-center justify-center bg-[#d01f25]/60 px-1 text-center text-[9px] leading-tight font-bold text-white">
                          {t("gifts.doubleTapConfirm")}
                        </span>
                      ) : null}
                    </span>
                    <span className="w-full truncate text-center text-[11px] leading-tight font-semibold text-white">
                      {gift.name}
                    </span>
                    <span className="mt-0.5 flex items-center justify-center gap-0.5">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src="/images/diamond.png"
                        alt=""
                        width={10}
                        height={10}
                        className="size-2.5 object-contain"
                      />
                      <span className="text-[10px] leading-none text-white/80 tabular-nums">
                        {gift.price}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {success ? (
            <p className="mt-4 text-center text-[13px] font-bold text-white" role="status">
              {success}
            </p>
          ) : null}
          {error ? (
            <p className="mt-4 text-center text-[13px] font-bold text-[#f0454a]" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      </PageMain>

      <GiftDialog
        open={confirmGift !== null && staff !== null}
        title={t("gifts.confirmTitle")}
        onClose={() => {
          if (!pending) {
            setConfirmGift(null);
            disarm();
          }
        }}
        footer={
          <GiftDialogButtons
            cancelLabel={t("gifts.cancel")}
            confirmLabel={pending ? t("gifts.sending") : t("gifts.confirm")}
            busy={pending}
            onCancel={() => {
              setConfirmGift(null);
              disarm();
            }}
            onConfirm={() => {
              if (confirmGift) trySend(confirmGift);
            }}
          />
        }
      >
        {confirmGift && staff
          ? t("gifts.confirmBody", { gift: confirmGift.name, name: staff.name })
          : null}
      </GiftDialog>

      <GiftDialog
        open={shortGift !== null && staff !== null}
        title={t("gifts.insufficientTitle")}
        onClose={() => {
          setShortGift(null);
          disarm();
        }}
        footer={
          <GiftDialogButtons
            cancelLabel={t("gifts.rechargeLater")}
            confirmLabel={t("gifts.rechargeNow")}
            onCancel={() => {
              setShortGift(null);
              disarm();
            }}
            onConfirm={goRecharge}
          />
        }
      >
        {shortGift && staff
          ? t("gifts.insufficientBody", {
              gift: shortGift.gift.name,
              n: shortGift.shortfall,
              name: staff.name,
            })
          : null}
      </GiftDialog>
    </div>
  );
}