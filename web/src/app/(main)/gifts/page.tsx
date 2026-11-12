import { StaffSelectClient } from "@/components/gifts/StaffSelectClient";
import { GiftStaffBodySkeleton } from "@/components/navigation/PageSkeletons";
import { loadStaffSelectPage } from "@/lib/api/gifts";
import { Suspense } from "react";
import { DevMockBadge } from "@/components/dev/DevMockBadge";

async function StaffContent() {
  const data = await loadStaffSelectPage();
  return (
    <>
      <div className="anim-content-fade flex min-h-0 flex-1 flex-col">
        <StaffSelectClient
          staffs={data.staffs}
          recents={data.recents}
          customers={data.customers}
          customerRecents={data.customerRecents}
        />
      </div>
      <DevMockBadge />
    </>
  );
}

export default function GiftsPage() {
  return (
    <Suspense fallback={<GiftStaffBodySkeleton />}>
      <StaffContent />
    </Suspense>
  );
}
