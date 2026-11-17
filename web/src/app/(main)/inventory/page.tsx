"use client";

import { useAuthedPage } from "@/components/auth/useAuthedPage";
import { InventoryPageClient } from "@/components/inventory/InventoryPageClient";
import { PageMain } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { InventoryBodySkeleton } from "@/components/navigation/PageSkeletons";
import { useTranslations } from "@/i18n/locale-provider";
import { loadInventory } from "@/lib/api/inventory";
import type { InventoryData } from "@/lib/mock/inventory";
import { Suspense, useEffect, useState } from "react";

function InventoryInner() {
  const ready = useAuthedPage();
  const t = useTranslations();
  const [data, setData] = useState<InventoryData | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    void loadInventory()
      .then((next) => {
        if (!cancelled) setData(next);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [ready]);

  return (
    <>
      <PageHeader titleKey="inventory.title" backHref="/" />
      <PageMain>
        {failed ? (
          <p className="px-6 pt-10 text-center text-[14px] text-white/60">{t("common.pageError")}</p>
        ) : data ? (
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
