"use client";

import { useAuthedPage } from "@/components/auth/useAuthedPage";
import { ReceivedGiftsList } from "@/components/history/ReceivedGiftsList";
import { PageMain } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { ReceivedGiftsBodySkeleton } from "@/components/navigation/PageSkeletons";
import { useTranslations } from "@/i18n/locale-provider";
import { loadReceivedGifts } from "@/lib/api/history";
import type { ReceivedGiftRecord } from "@/lib/mock/history";
import { Suspense, useEffect, useState } from "react";

function ReceivedGiftsInner() {
  const ready = useAuthedPage();
  const t = useTranslations();
  const [received, setReceived] = useState<ReceivedGiftRecord[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    void loadReceivedGifts()
      .then((next) => {
        if (!cancelled) setReceived(next);
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
      <PageHeader titleKey="profile.receivedGifts" backHref="/?tab=me" />
      <PageMain>
        {failed ? (
          <p className="px-6 pt-10 text-center text-[14px] text-white/60">{t("common.pageError")}</p>
        ) : received ? (
          <div className="anim-content-fade">
            <ReceivedGiftsList received={received} />
          </div>
        ) : (
          <ReceivedGiftsBodySkeleton />
        )}
      </PageMain>
    </>
  );
}

/** 收到的礼物: gifts other customers sent me (GET /api/customer/gifts?direction=received). */
export default function ReceivedGiftsPage() {
  // useAuthedPage reads useSearchParams, which needs a Suspense boundary for the static export.
  return (
    <Suspense fallback={<ReceivedGiftsBodySkeleton />}>
      <ReceivedGiftsInner />
    </Suspense>
  );
}
