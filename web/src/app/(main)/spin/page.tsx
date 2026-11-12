import { SpinPageClient } from "@/components/spin/SpinPageClient";
import { PageMain } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { SpinBodySkeleton } from "@/components/navigation/PageSkeletons";
import { loadSpinStatus } from "@/lib/api/spin";
import { Suspense } from "react";
import { DevMockBadge } from "@/components/dev/DevMockBadge";

async function SpinContent() {
  const status = await loadSpinStatus();
  return (
    <>
      <div className="anim-content-fade">
        <SpinPageClient initialStatus={status} />
      </div>
      <DevMockBadge />
    </>
  );
}

export default function SpinPage() {
  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/spin-stage-bg.webp"
        alt=""
        className="pointer-events-none absolute inset-0 h-full w-full object-cover object-[center_90%]"
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(20,4,8,0.80)_0%,rgba(20,4,8,0.76)_52%,rgba(20,4,8,0.70)_100%)]"
        aria-hidden="true"
      />
      <PageHeader titleKey="spin.title" backHref="/" />
      <PageMain>
        <Suspense fallback={<SpinBodySkeleton />}>
          <SpinContent />
        </Suspense>
      </PageMain>
    </div>
  );
}
