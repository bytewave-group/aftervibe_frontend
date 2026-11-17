"use client";

import { useAuthedPage } from "@/components/auth/useAuthedPage";
import { HistoryRechargeDetail } from "@/components/history/HistoryRechargeDetail";
import { PageMain } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { HistoryBodySkeleton } from "@/components/navigation/PageSkeletons";
import { useTranslations } from "@/i18n/locale-provider";
import { loadCoinOrder } from "@/lib/api/history";
import type { RechargeRecord } from "@/lib/mock/history";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function DetailInner() {
  const ready = useAuthedPage();
  const t = useTranslations();
  const params = useSearchParams();
  const id = params.get("id") ?? "";
  const [record, setRecord] = useState<RechargeRecord | null | undefined>(undefined);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    void loadCoinOrder(id)
      .then((next) => {
        if (!cancelled) setRecord(next);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [ready, id]);

  return (
    <>
      <PageHeader titleKey="history.detailTitle" backHref="/profile/history?tab=recharge" />
      <PageMain>
        {failed ? (
          <p className="px-6 pt-10 text-center text-[14px] text-white/60">{t("common.pageError")}</p>
        ) : record ? (
          <div className="anim-content-fade">
            <HistoryRechargeDetail record={record} />
          </div>
        ) : record === null ? (
          <p className="px-6 pt-10 text-center text-[14px] text-white/60">{t("history.detailNotFound")}</p>
        ) : (
          <HistoryBodySkeleton />
        )}
      </PageMain>
    </>
  );
}

export default function HistoryRechargeDetailPage() {
  return (
    <Suspense fallback={<HistoryBodySkeleton />}>
      <DetailInner />
    </Suspense>
  );
}
