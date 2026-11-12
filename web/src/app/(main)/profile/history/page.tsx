import { HistoryPageClient } from "@/components/history/HistoryPageClient";
import { PageMain } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { HistoryBodySkeleton } from "@/components/navigation/PageSkeletons";
import { loadHistory } from "@/lib/api/history";
import { Suspense } from "react";
import { DevMockBadge } from "@/components/dev/DevMockBadge";

async function HistoryContent() {
  const { gifts, recharges } = await loadHistory();
  return (
    <>
      <div className="anim-content-fade">
        <HistoryPageClient gifts={gifts} recharges={recharges} />
      </div>
      <DevMockBadge />
    </>
  );
}

export default function HistoryPage() {
  return (
    <>
      <PageHeader titleKey="history.title" backHref="/?tab=me" />
      <PageMain>
        <Suspense fallback={<HistoryBodySkeleton />}>
          <HistoryContent />
        </Suspense>
      </PageMain>
    </>
  );
}
