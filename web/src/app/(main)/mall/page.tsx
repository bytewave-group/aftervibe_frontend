"use client";

import { useAuthedPage } from "@/components/auth/useAuthedPage";
import { PageMain } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { MallPageClient } from "@/components/mall/MallPageClient";
import { MallBodySkeleton } from "@/components/navigation/PageSkeletons";
import { useTranslations } from "@/i18n/locale-provider";
import { loadMall } from "@/lib/api/mall";
import type { MallData } from "@/lib/mock/mall";
import { Suspense, useEffect, useState } from "react";

function MallInner() {
  const ready = useAuthedPage();
  const t = useTranslations();
  const [data, setData] = useState<MallData | null>(null);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    void loadMall()
      .then((next) => {
        if (!cancelled) setData(next);
      })
      .catch(() => {
        if (!cancelled) setData({ enabled: false, points: 0, packages: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [ready]);

  return (
    <>
      <PageHeader titleKey="mall.title" backHref="/" />
      <PageMain>
        {data == null ? (
          <MallBodySkeleton />
        ) : data.enabled ? (
          <div className="anim-content-fade">
            <MallPageClient initialData={data} />
          </div>
        ) : (
          <p className="px-6 pt-16 text-center text-[16px] leading-snug font-bold text-white">
            {t("mall.unavailable")}
          </p>
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
