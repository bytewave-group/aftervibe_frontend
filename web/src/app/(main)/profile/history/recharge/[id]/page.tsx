import { HistoryRechargeDetail } from "@/components/history/HistoryRechargeDetail";
import { PageMain } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { HistoryBodySkeleton } from "@/components/navigation/PageSkeletons";
import { getT } from "@/i18n/get-locale";
import { loadCoinOrder } from "@/lib/api/history";
import { cache, Suspense } from "react";
import { DevMockBadge } from "@/components/dev/DevMockBadge";

const loadOrder = cache(loadCoinOrder);

async function DetailContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { t } = await getT();
  const record = await loadOrder(decodeURIComponent(id));

  return (
    <>
      <div className="anim-content-fade">
        {record ? (
          <HistoryRechargeDetail record={record} />
        ) : (
          <p className="px-6 pt-10 text-center text-[14px] text-white/60">
            {t("history.detailNotFound")}
          </p>
        )}
      </div>
      <DevMockBadge />
    </>
  );
}

export default function HistoryRechargeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <>
      <PageHeader titleKey="history.detailTitle" backHref="/profile/history?tab=recharge" />
      <PageMain>
        <Suspense fallback={<HistoryBodySkeleton />}>
          <DetailContent params={params} />
        </Suspense>
      </PageMain>
    </>
  );
}
