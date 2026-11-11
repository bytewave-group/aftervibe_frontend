import { MallPageClient } from "@/components/mall/MallPageClient";
import { PageMain } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { MallBodySkeleton } from "@/components/navigation/PageSkeletons";
import { loadMall } from "@/lib/api/mall";
import { Suspense } from "react";

async function MallContent() {
  const data = await loadMall();
  return (
    <div className="anim-content-fade">
      <MallPageClient initialData={data} />
    </div>
  );
}

export default function MallPage() {
  return (
    <>
      <PageHeader titleKey="mall.title" backHref="/" />
      <PageMain>
        <Suspense fallback={<MallBodySkeleton />}>
          <MallContent />
        </Suspense>
      </PageMain>
    </>
  );
}
