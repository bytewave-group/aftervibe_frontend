"use client";

import { useAuthedPage } from "@/components/auth/useAuthedPage";
import { PageMain } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { NotificationsBodySkeleton } from "@/components/navigation/PageSkeletons";
import { NotificationsPageClient } from "@/components/notifications/NotificationsPageClient";
import { loadNotifications } from "@/lib/api/notifications";
import type { NotificationsData } from "@/lib/mock/notifications";
import { Suspense, useEffect, useState } from "react";

function NotificationsInner() {
  const ready = useAuthedPage();
  const [data, setData] = useState<NotificationsData | null>(null);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    void loadNotifications().then((next) => {
      if (!cancelled) setData(next);
    });
    return () => {
      cancelled = true;
    };
  }, [ready]);

  return (
    <>
      <PageHeader titleKey="notificationsPage.title" backHref="/" />
      <PageMain>
        {data ? (
          <div className="anim-content-fade">
            <NotificationsPageClient initialData={data} />
          </div>
        ) : (
          <NotificationsBodySkeleton />
        )}
      </PageMain>
    </>
  );
}

export default function NotificationsPage() {
  return (
    <Suspense fallback={<NotificationsBodySkeleton />}>
      <NotificationsInner />
    </Suspense>
  );
}
