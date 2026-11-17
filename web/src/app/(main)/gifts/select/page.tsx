"use client";

import { useAuthedPage } from "@/components/auth/useAuthedPage";
import { GiftSelectClient } from "@/components/gifts/GiftSelectClient";
import { GiftSelectBodySkeleton } from "@/components/navigation/PageSkeletons";
import { loadGiftSelectPage } from "@/lib/api/gifts";
import type { GiftRecipientType, GiftStaff, GiftItem } from "@/lib/mock/gifts";
import type { GiftBalance } from "@/lib/mock/gifts";
import { useTranslations } from "@/i18n/locale-provider";
import { notFound, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function positiveIntParam(value: string | null): number | null {
  if (!value || !/^[1-9]\d*$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

interface SelectData {
  staff: GiftStaff | null;
  recipientType: GiftRecipientType;
  gifts: GiftItem[];
  balance: GiftBalance;
  confirmThreshold: number;
}

function SelectInner() {
  const ready = useAuthedPage();
  const t = useTranslations();
  const params = useSearchParams();
  const id = positiveIntParam(params.get("id"));
  const recipient: GiftRecipientType = params.get("recipient") === "customer" ? "customer" : "staff";
  const [data, setData] = useState<SelectData | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!ready || id == null) return;
    let cancelled = false;
    void loadGiftSelectPage(id, recipient)
      .then((next) => {
        if (!cancelled) setData(next);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [ready, id, recipient]);

  if (id == null) {
    notFound();
  }

  if (failed) {
    return (
      <p className="px-6 pt-16 text-center text-[16px] leading-snug font-bold text-white">
        {t("common.pageError")}
      </p>
    );
  }

  if (!data) return <GiftSelectBodySkeleton />;

  return (
    <div className="anim-content-fade flex min-h-0 flex-1 flex-col">
      <GiftSelectClient
        staff={data.staff}
        recipientType={data.recipientType}
        gifts={data.gifts}
        balance={data.balance}
        confirmThreshold={data.confirmThreshold}
      />
    </div>
  );
}

export default function GiftSelectPage() {
  return (
    <Suspense fallback={<GiftSelectBodySkeleton />}>
      <SelectInner />
    </Suspense>
  );
}
