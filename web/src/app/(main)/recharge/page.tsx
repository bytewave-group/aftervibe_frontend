"use client";

import { useAuthedPage } from "@/components/auth/useAuthedPage";
import { RechargeBodySkeleton } from "@/components/navigation/PageSkeletons";
import { RechargePageClient } from "@/components/recharge/RechargePageClient";
import { loadRecharge } from "@/lib/api/recharge";
import { safeRedirectPath } from "@/lib/auth/redirect";
import type { RechargeData } from "@/lib/mock/recharge";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function RechargeInner() {
  const ready = useAuthedPage();
  const params = useSearchParams();
  const [data, setData] = useState<RechargeData | null>(null);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    void loadRecharge().then((next) => {
      if (!cancelled) setData(next);
    });
    return () => {
      cancelled = true;
    };
  }, [ready]);

  const shortfallRaw = Number(params.get("shortfall"));
  const shortfall = Number.isFinite(shortfallRaw) && shortfallRaw > 0 ? shortfallRaw : null;

  if (!data) return <RechargeBodySkeleton />;

  return (
    <div className="anim-content-fade flex min-h-0 flex-1 flex-col">
      <RechargePageClient
        initialData={data}
        shortfall={shortfall}
        backHref={safeRedirectPath(params.get("from"), "/")}
        returnedOrderNo={params.get("coin_order")?.trim() || null}
      />
    </div>
  );
}

export default function RechargePage() {
  return (
    <Suspense fallback={<RechargeBodySkeleton />}>
      <RechargeInner />
    </Suspense>
  );
}
