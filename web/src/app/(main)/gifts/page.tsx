"use client";

import { useAuthedPage } from "@/components/auth/useAuthedPage";
import { StaffSelectClient } from "@/components/gifts/StaffSelectClient";
import { GiftStaffBodySkeleton } from "@/components/navigation/PageSkeletons";
import { useTranslations } from "@/i18n/locale-provider";
import { loadStaffSelectPage } from "@/lib/api/gifts";
import type { GiftStaff } from "@/lib/mock/gifts";
import { Suspense, useEffect, useState } from "react";

interface StaffPageData {
  staffs: GiftStaff[];
  recents: GiftStaff[];
  customers: GiftStaff[];
  customerRecents: GiftStaff[];
}

function GiftsInner() {
  const ready = useAuthedPage();
  const t = useTranslations();
  const [data, setData] = useState<StaffPageData | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    void loadStaffSelectPage()
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

  if (failed) {
    return (
      <p className="px-6 pt-16 text-center text-[16px] leading-snug font-bold text-white">
        {t("common.pageError")}
      </p>
    );
  }

  if (!data) return <GiftStaffBodySkeleton />;

  return (
    <div className="anim-content-fade flex min-h-0 flex-1 flex-col">
      <StaffSelectClient
        staffs={data.staffs}
        recents={data.recents}
        customers={data.customers}
        customerRecents={data.customerRecents}
      />
    </div>
  );
}

export default function GiftsPage() {
  return (
    <Suspense fallback={<GiftStaffBodySkeleton />}>
      <GiftsInner />
    </Suspense>
  );
}
