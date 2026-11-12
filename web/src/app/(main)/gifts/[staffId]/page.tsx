import { GiftSelectClient } from "@/components/gifts/GiftSelectClient";
import { GiftSelectBodySkeleton } from "@/components/navigation/PageSkeletons";
import { loadGiftSelectPage } from "@/lib/api/gifts";
import { Suspense } from "react";
import { DevMockBadge } from "@/components/dev/DevMockBadge";

async function GiftContent({ params }: { params: Promise<{ staffId: string }> }) {
  const { staffId } = await params;
  const id = Number(staffId);
  const data = await loadGiftSelectPage(Number.isFinite(id) ? id : 0);
  return (
    <>
      <div className="anim-content-fade flex min-h-0 flex-1 flex-col">
        <GiftSelectClient
          staff={data.staff}
          recipientType="staff"
          gifts={data.gifts}
          balance={data.balance}
          confirmThreshold={data.confirmThreshold}
        />
      </div>
      <DevMockBadge />
    </>
  );
}

export default function GiftSelectPage({
  params,
}: {
  params: Promise<{ staffId: string }>;
}) {
  return (
    <Suspense fallback={<GiftSelectBodySkeleton />}>
      <GiftContent params={params} />
    </Suspense>
  );
}
