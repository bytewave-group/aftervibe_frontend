import { GiftSelectClient } from "@/components/gifts/GiftSelectClient";
import { GiftSelectBodySkeleton } from "@/components/navigation/PageSkeletons";
import { loadGiftSelectPage } from "@/lib/api/gifts";
import { Suspense } from "react";
import { DevMockBadge } from "@/components/dev/DevMockBadge";

async function GiftContent({
  params,
}: {
  params: Promise<{ customerId: string }>;
}) {
  const { customerId } = await params;
  const id = Number(customerId);
  const data = await loadGiftSelectPage(Number.isFinite(id) ? id : 0, "customer");
  return (
    <>
      <div className="anim-content-fade flex min-h-0 flex-1 flex-col">
        <GiftSelectClient
          staff={data.staff}
          recipientType="customer"
          gifts={data.gifts}
          balance={data.balance}
          confirmThreshold={data.confirmThreshold}
        />
      </div>
      <DevMockBadge />
    </>
  );
}

export default function CustomerGiftSelectPage({
  params,
}: {
  params: Promise<{ customerId: string }>;
}) {
  return (
    <Suspense fallback={<GiftSelectBodySkeleton />}>
      <GiftContent params={params} />
    </Suspense>
  );
}
