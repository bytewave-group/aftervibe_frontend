"use client";

import { useAuthedPage } from "@/components/auth/useAuthedPage";
import { InventoryPageClient } from "@/components/inventory/InventoryPageClient";
import { PageMain } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { InventoryBodySkeleton } from "@/components/navigation/PageSkeletons";
import { loadInventory } from "@/lib/api/inventory";
import type { InventoryData } from "@/lib/mock/inventory";
import { Suspense, useEffect, useState } from "react";

function InventoryInner() {
  const ready = useAuthedPage();
  const [data, setData] = useState<InventoryData | null>(null);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    void loadInventory().then((next) => {
      if (!cancelled) setData(next);
    });
    return () => {
      cancelled = true;
    };
  }, [ready]);

  return (
    <>
      <PageHeader titleKey="inventory.title" backHref="/" />
      <PageMain>
        {data ? (
          <div className="anim-content-fade">
            <InventoryPageClient initialData={data} />
          </div>
        ) : (
          <InventoryBodySkeleton />
        )}
      </PageMain>
    </>
  );
}

export default function InventoryPage() {
  return (
    <Suspense fallback={<InventoryBodySkeleton />}>
      <InventoryInner />
    </Suspense>
  );
}
