"use client";

import { useAuthedPage } from "@/components/auth/useAuthedPage";
import { GiftSelectClient } from "@/components/gifts/GiftSelectClient";
import { GiftSelectBodySkeleton } from "@/components/navigation/PageSkeletons";
import { loadGiftSelectPage } from "@/lib/api/gifts";
import type { GiftRecipientType, GiftStaff, GiftItem } from "@/lib/mock/gifts";
import type { GiftBalance } from "@/lib/mock/gifts";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

interface SelectData {
  staff: GiftStaff | null;
  recipientType: GiftRecipientType;
  gifts: GiftItem[];
  balance: GiftBalance;
  confirmThreshold: number;
}

function SelectInner() {
  const ready = useAuthedPage();
  const params = useSearchParams();
  const id = Number(params.get("id"));
  const recipient: GiftRecipientType = params.get("recipient") === "customer" ? "customer" : "staff";
  const [data, setData] = useState<SelectData | null>(null);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    void loadGiftSelectPage(Number.isFinite(id) ? id : 0, recipient).then((next) => {
      if (!cancelled) setData(next);
    });
    return () => {
      cancelled = true;
    };
  }, [ready, id, recipient]);

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
