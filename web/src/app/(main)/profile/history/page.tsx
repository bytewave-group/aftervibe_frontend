"use client";

import { useAuthedPage } from "@/components/auth/useAuthedPage";
import { HistoryPageClient } from "@/components/history/HistoryPageClient";
import { PageMain } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { HistoryBodySkeleton } from "@/components/navigation/PageSkeletons";
import { loadHistory } from "@/lib/api/history";
import type { HistoryData } from "@/lib/mock/history";
import { Suspense, useEffect, useState } from "react";

function HistoryInner() {
  const ready = useAuthedPage();
  const [data, setData] = useState<HistoryData | null>(null);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    void loadHistory().then((next) => {
      if (!cancelled) setData(next);
    });
    return () => {
      cancelled = true;
    };
  }, [ready]);

  return (
    <>
      <PageHeader titleKey="history.title" backHref="/?tab=me" />
      <PageMain>
        {data ? (
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
