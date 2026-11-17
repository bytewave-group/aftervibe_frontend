"use client";

import { useAuthedPage } from "@/components/auth/useAuthedPage";
import { PageMain } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { SpinBodySkeleton } from "@/components/navigation/PageSkeletons";
import { SpinPageClient } from "@/components/spin/SpinPageClient";
import { useTranslations } from "@/i18n/locale-provider";
import { loadSpinStatus } from "@/lib/api/spin";
import type { SpinStatus } from "@/lib/mock/spin";
import { Suspense, useEffect, useState } from "react";

function SpinInner() {
  const ready = useAuthedPage();
  const t = useTranslations();
  const [status, setStatus] = useState<SpinStatus | null>(null);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    void loadSpinStatus()
      .then((next) => {
        if (!cancelled) setStatus(next);
      })
      .catch(() => {
        if (!cancelled) {
          setStatus({
            configured: false,
            chances: 0,
            dailyChances: 0,
            nextSpinSeconds: 0,
            cost: { coins: null, points: null },
            balance: 0,
            rewardPoints: 0,
            paidSpinsRemaining: null,
            prizes: [],
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [ready]);

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
        {status == null ? (
          <SpinBodySkeleton />
        ) : status.configured ? (
          <div className="anim-content-fade">
            <SpinPageClient initialStatus={status} />
          </div>
        ) : (
          <p className="px-6 pt-16 text-center text-[16px] leading-snug font-bold text-white">
            {t("spin.unavailable")}
          </p>
        )}
      </PageMain>
    </div>
  );
}

export default function SpinPage() {
  return (
    <Suspense fallback={<SpinBodySkeleton />}>
      <SpinInner />
    </Suspense>
  );
}
