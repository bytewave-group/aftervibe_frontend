"use client";

import { useAuthedPage } from "@/components/auth/useAuthedPage";
import { HistoryPageClient } from "@/components/history/HistoryPageClient";
import { PageMain } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { HistoryBodySkeleton } from "@/components/navigation/PageSkeletons";
import { useTranslations } from "@/i18n/locale-provider";
import { loadHistory } from "@/lib/api/history";
import type { HistoryData } from "@/lib/mock/history";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function HistoryInner() {
  const ready = useAuthedPage();
  const t = useTranslations();
  const router = useRouter();
  // Old links (profile menu / gift notifications) used ?tab=received; received gifts have their own page now.
  const legacyReceived = useSearchParams().get("tab") === "received";
  const [data, setData] = useState<HistoryData | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (legacyReceived) router.replace("/profile/received-gifts");
  }, [legacyReceived, router]);

  useEffect(() => {
    if (!ready || legacyReceived) return;
    let cancelled = false;
    void loadHistory()
      .then((next) => {
        if (!cancelled) setData(next);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [ready, legacyReceived]);

  return (
    <>
      <PageHeader titleKey="history.title" backHref="/?tab=me" />
      <PageMain>
        {failed ? (
          <p className="px-6 pt-10 text-center text-[14px] text-white/60">{t("common.pageError")}</p>
        ) : data ? (
          <div className="anim-content-fade">
            <HistoryPageClient gifts={data.gifts} recharges={data.recharges} />
          </div>
        ) : (
          <HistoryBodySkeleton />
        )}
      </PageMain>
    </>
  );
}

export default function HistoryPage() {
  return (
    <Suspense fallback={<HistoryBodySkeleton />}>
      <HistoryInner />
    </Suspense>
  );
}
