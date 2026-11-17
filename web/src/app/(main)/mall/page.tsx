"use client";

import { useAuthedPage } from "@/components/auth/useAuthedPage";
import { PageMain } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { MallPageClient } from "@/components/mall/MallPageClient";
import { MallBodySkeleton } from "@/components/navigation/PageSkeletons";
import { loadMall } from "@/lib/api/mall";
import type { MallData } from "@/lib/mock/mall";
import { Suspense, useEffect, useState } from "react";

function MallInner() {
  const ready = useAuthedPage();
  const [data, setData] = useState<MallData | null>(null);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    void loadMall().then((next) => {
      if (!cancelled) setData(next);
    });
    return () => {
      cancelled = true;
    };
  }, [ready]);

  return (
    <>
      <PageHeader titleKey="mall.title" backHref="/" />
      <PageMain>
        {data ? (
          <div className="anim-content-fade">
            <MallPageClient initialData={data} />
          </div>
        ) : (
          <MallBodySkeleton />
        )}
      </PageMain>
    </>
  );
}

export default function MallPage() {
  return (
    <Suspense fallback={<MallBodySkeleton />}>
      <MallInner />
    </Suspense>
  );
}
