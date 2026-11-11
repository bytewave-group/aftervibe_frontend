import { SpinPageClient } from "@/components/spin/SpinPageClient";
import { PageMain } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { SpinBodySkeleton } from "@/components/navigation/PageSkeletons";
import { loadSpinStatus } from "@/lib/api/spin";
import { Suspense } from "react";

async function SpinContent() {
  const status = await loadSpinStatus();
  return (
    <div className="anim-content-fade">
      <SpinPageClient initialStatus={status} />
    </div>
  );
}

export default function SpinPage() {
  return (
    <>
      <PageHeader titleKey="spin.title" backHref="/" />
      <PageMain>
        <Suspense fallback={<SpinBodySkeleton />}>
          <SpinContent />
        </Suspense>
      </PageMain>
    </>
  );
}
