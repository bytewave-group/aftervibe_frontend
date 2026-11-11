import { InventoryPageClient } from "@/components/inventory/InventoryPageClient";
import { PageMain } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { InventoryBodySkeleton } from "@/components/navigation/PageSkeletons";
import { loadInventory } from "@/lib/api/inventory";
import { Suspense } from "react";

async function InventoryContent() {
  const data = await loadInventory();
  return (
    <div className="anim-content-fade">
      <InventoryPageClient initialData={data} />
    </div>
  );
}

export default function InventoryPage() {
  return (
    <>
      <PageHeader titleKey="inventory.title" backHref="/" />
      <PageMain>
        <Suspense fallback={<InventoryBodySkeleton />}>
          <InventoryContent />
        </Suspense>
      </PageMain>
    </>
  );
}
