import { NotificationsPageClient } from "@/components/notifications/NotificationsPageClient";
import { PageMain } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { NotificationsBodySkeleton } from "@/components/navigation/PageSkeletons";
import { loadNotifications } from "@/lib/api/notifications";
import { Suspense } from "react";
import { DevMockBadge } from "@/components/dev/DevMockBadge";

async function NotificationsContent() {
  const data = await loadNotifications();
  return (
    <>
      <div className="anim-content-fade">
        <NotificationsPageClient initialData={data} />
      </div>
      <DevMockBadge />
    </>
  );
}

export default function NotificationsPage() {
  return (
    <>
      <PageHeader titleKey="notificationsPage.title" backHref="/" />
      <PageMain>
        <Suspense fallback={<NotificationsBodySkeleton />}>
          <NotificationsContent />
        </Suspense>
      </PageMain>
    </>
  );
}
