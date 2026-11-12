import { RechargePageClient } from "@/components/recharge/RechargePageClient";
import { RechargeBodySkeleton } from "@/components/navigation/PageSkeletons";
import { loadRecharge } from "@/lib/api/recharge";
import { safeRedirectPath } from "@/lib/auth/redirect";
import { Suspense } from "react";
import { DevMockBadge } from "@/components/dev/DevMockBadge";

async function RechargeContent({
  searchParams,
}: {
  searchParams: Promise<{ shortfall?: string; from?: string; coin_order?: string }>;
}) {
  const params = await searchParams;
  const data = await loadRecharge();
  const shortfallRaw = Number(params.shortfall);
  const shortfall = Number.isFinite(shortfallRaw) && shortfallRaw > 0 ? shortfallRaw : null;

  return (
    <>
      <div className="anim-content-fade flex min-h-0 flex-1 flex-col">
        <RechargePageClient
          initialData={data}
          shortfall={shortfall}
          backHref={safeRedirectPath(params.from, "/")}
          returnedOrderNo={params.coin_order?.trim() || null}
        />
      </div>
      <DevMockBadge />
    </>
  );
}

export default function RechargePage({
  searchParams,
}: {
  searchParams: Promise<{ shortfall?: string; from?: string; coin_order?: string }>;
}) {
  return (
    <Suspense fallback={<RechargeBodySkeleton />}>
      <RechargeContent searchParams={searchParams} />
    </Suspense>
  );
}
