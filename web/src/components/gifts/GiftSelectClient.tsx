"use client";

import { GiftDialog, GiftDialogButtons } from "@/components/gifts/GiftDialog";
import { ShieldIcon } from "@/components/gifts/GiftIcons";
import { HeaderDiamondBalance } from "@/components/common/HeaderDiamondBalance";
import { GiftFlowHeader } from "@/components/gifts/GiftFlowHeader";
import { GiftInfoTooltip } from "@/components/gifts/GiftInfoTooltip";
import { GiftSearchBar } from "@/components/gifts/GiftSearchBar";
import { rememberRecentCustomer, rememberRecentStaff, useConfirmToggle } from "@/components/gifts/recent";
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
  type GiftRecipientType,
  type GiftStaff,
} from "@/lib/mock/gifts";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { FIGMA_SHEET_BG } from "@/lib/figma-backgrounds";

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

/** Live-stream style combo: after a send, the same tile keeps sending one unit per tap for this long. */
const COMBO_WINDOW_MS = 4000;

type ComboState = {
  gift: GiftItem;
  id: string;
  /** Taps sent in this combo (optimistic; failed taps are rolled back). */
  count: number;
  /** Bumped per tap to restart the countdown ring / ×N pop. */
  tick: number;
};

function newComboId(): string {
  const raw =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return raw.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 64);
}

export function GiftSelectClient({
  staff,
  recipientType = "staff",
  gifts,
  balance: initialBalance,
  confirmThreshold = CONFIRM_THRESHOLD,
}: {
  staff: GiftStaff | null;
  recipientType?: GiftRecipientType;
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
  const [combo, setCombo] = useState<ComboState | null>(null);
  const comboRef = useRef<ComboState | null>(null);
  const comboTimerRef = useRef<number | null>(null);
  const comboChainRef = useRef<Promise<void>>(Promise.resolve());
  const comboInFlightRef = useRef(0);
  const balanceRef = useRef(balance);

  useEffect(() => {
    balanceRef.current = balance;
  }, [balance]);

  useEffect(() => {
    if (!staff) {
      return;
    }
    if (recipientType === "customer") {
      rememberRecentCustomer(staff);
      return;
    }
    rememberRecentStaff(staff);
  }, [staff, recipientType]);

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

  const endCombo = useCallback(() => {
    if (comboTimerRef.current != null) {
      window.clearTimeout(comboTimerRef.current);
      comboTimerRef.current = null;
    }
    comboRef.current = null;
    setCombo(null);
  }, []);

  const setComboState = useCallback(
    (next: ComboState) => {
      comboRef.current = next;
      setCombo(next);
      if (comboTimerRef.current != null) {
        window.clearTimeout(comboTimerRef.current);
      }
      comboTimerRef.current = window.setTimeout(endCombo, COMBO_WINDOW_MS);
    },
    [endCombo],
  );

  useEffect(
    () => () => {
      if (comboTimerRef.current != null) {
        window.clearTimeout(comboTimerRef.current);
      }
    },
    [],
  );

  /** One more unit of the gift on the running combo: no arm / confirm, held per tap, sent in order. */
  const comboTap = (gift: GiftItem) => {
    const current = comboRef.current;
    if (!staff || !current) return;
    setError(null);

    if (balanceRef.current.available < gift.price) {
      endCombo();
      setShortGift({
        gift,
        shortfall: Math.max(1, gift.price - balanceRef.current.available),
      });
      return;
    }

    const next = { ...current, count: current.count + 1, tick: current.tick + 1 };
    setComboState(next);
    setSuccess(t("gifts.comboSent", { n: next.count }));
    const optimistic = {
      ...balanceRef.current,
      available: Math.max(0, balanceRef.current.available - gift.price),
    };
    balanceRef.current = optimistic;
    setBalance(optimistic);

    comboInFlightRef.current += 1;
    const comboId = current.id;
    comboChainRef.current = comboChainRef.current.then(async () => {
      const result = await sendGiftAction({
        staffId: staff.id,
        recipientId: staff.id,
        recipientType,
        displayId: gift.displayId,
        interactionId: gift.interactionId,
        price: gift.price,
        comboId,
        comboTap: true,
      });
      comboInFlightRef.current -= 1;
      const stillQueued = comboInFlightRef.current * gift.price;

      if (result.ok) {
        const synced = {
          ...balanceRef.current,
          balance: result.balance,
          available: Math.max(0, result.available - stillQueued),
        };
        balanceRef.current = synced;
        setBalance(synced);
        return;
      }

      // Roll this tap back and stop the combo.
      const live = comboRef.current;
      if (live && live.id === comboId) {
        endCombo();
      }
      setSuccess(null);
      if (result.reason === "insufficient") {
        const synced = {
          ...balanceRef.current,
          balance: result.balance,
          available: Math.max(0, result.available - stillQueued),
        };
        balanceRef.current = synced;
        setBalance(synced);
        setShortGift({ gift, shortfall: result.shortfall });
        return;
      }
      setError(result.message || t("gifts.errorGeneric"));
    });
  };

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

    const comboId = newComboId();
    startTransition(async () => {
      const result = await sendGiftAction({
        staffId: staff.id,
        recipientId: staff.id,
        recipientType,
        displayId: gift.displayId,
        interactionId: gift.interactionId,
        price: gift.price,
        comboId,
      });
      if (result.ok) {
        const synced = {
          ...balanceRef.current,
          balance: result.balance,
          available: result.available,
        };
        balanceRef.current = synced;
        setBalance(synced);
        setConfirmGift(null);
        disarm();
        setSuccess(t("gifts.sent"));
        // The 588+ confirm (if any) covered this whole combo: further taps send right away.
        setComboState({ gift, id: comboId, count: 1, tick: 0 });
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
    const running = comboRef.current;
    if (running && running.gift.interactionId === gift.interactionId && running.gift.displayId === gift.displayId) {
      comboTap(gift);
      return;
    }
    if (running) {
      endCombo();
    }
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
    const from =
      staff == null
        ? "/gifts"
        : `/gifts/select?id=${staff.id}&recipient=${recipientType}`;
    params.set("from", from);
    begin(`/recharge?${params.toString()}`, NAV_FORWARD);
  };

  return (
    <div
      className="flex min-h-0 flex-1 flex-col"
      style={{
        background: FIGMA_SHEET_BG,
      }}
    >
      <GiftFlowHeader
        titleKey="gifts.giftTitle"
        backHref="/gifts"
        right={<HeaderDiamondBalance amount={balance.available} />}
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
              {t(recipientType === "customer" ? "gifts.customerMissing" : "gifts.staffMissing")}
            </p>
          ) : filtered.length === 0 ? (
            <p className="py-10 text-center text-[13px] text-white/50">
              {t("gifts.emptyGifts")}
            </p>
          ) : (
            <div className="grid grid-cols-4 gap-x-2.5 gap-y-4">
              {filtered.map((gift) => {
                const isCombo =
                  combo !== null &&
                  combo.gift.interactionId === gift.interactionId &&
                  combo.gift.displayId === gift.displayId;
                const isArmed = !isCombo && armedId === gift.interactionId;
                return (
                  <button
                    key={`${gift.displayId}-${gift.interactionId}`}
                    type="button"
                    data-gift-tile=""
                    data-combo={isCombo ? combo.count : undefined}
                    disabled={pending && !isCombo}
                    onClick={() => onSelectGift(gift)}
                    aria-label={isCombo ? `${gift.name} ${t("gifts.comboLabel")} ×${combo.count}` : undefined}
                    className={`anim-press flex flex-col items-center rounded-[12px] px-1.5 pt-1.5 pb-2 ${
                      isCombo
                        ? "ring-2 ring-[#ffc24a] bg-[#ffc24a]/10"
                        : isArmed
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
                      {isCombo ? (
                        <span className="absolute inset-0 flex flex-col items-center justify-center bg-black/45">
                          <svg
                            key={`ring-${combo.tick}`}
                            viewBox="0 0 36 36"
                            className="absolute inset-[6%] size-[88%] -rotate-90"
                            aria-hidden="true"
                          >
                            <circle cx="18" cy="18" r="16" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="2.5" />
                            <circle
                              cx="18"
                              cy="18"
                              r="16"
                              fill="none"
                              stroke="#ffc24a"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              pathLength={100}
                              strokeDasharray="100"
                              className="av-combo-ring"
                              style={{ ["--av-combo-ms" as string]: `${COMBO_WINDOW_MS}ms` }}
                            />
                          </svg>
                          <span
                            key={`count-${combo.count}`}
                            className="av-combo-pop relative text-[18px] leading-none font-black text-[#ffd36b] tabular-nums [text-shadow:0_1px_6px_rgba(0,0,0,0.6)]"
                          >
                            ×{combo.count}
                          </span>
                          <span className="relative mt-0.5 text-[9px] leading-none font-bold text-white">
                            {t("gifts.comboLabel")}
                          </span>
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
              {combo ? <span className="ml-1.5 font-semibold text-[#ffd36b]">· {t("gifts.comboHint")}</span> : null}
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