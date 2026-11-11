import { displayImageUrl } from "@/lib/api/images";
import { logApiFallback, redirectIfUnauthorized } from "@/lib/api/paginate";
import { apiGet } from "@/lib/api/server";
import type { StorageItemDto, StorageResponse } from "@/lib/api/types";
import {
  mockInventoryData,
  type InventoryData,
  type InventoryItem,
  type InventoryStatus,
} from "@/lib/mock/inventory";

export type { InventoryData };

const INVENTORY_PLACEHOLDER = "/images/giftbox.png";

function itemStatus(item: StorageItemDto): InventoryStatus {
  if (item.is_expired) {
    return "expired";
  }
  if (Number(item.remaining_qty) <= 0) {
    return "finished";
  }
  return "active";
}

function mapItem(item: StorageItemDto, index: number): InventoryItem {
  return {
    id: item.uuid || `storage-${index}`,
    name: item.product_name || "Item",
    image: displayImageUrl(item.image, INVENTORY_PLACEHOLDER),
    quantity: Number(item.quantity) || 0,
    remainingQty: Number(item.remaining_qty) || 0,
    storedAt: item.stored_at || "",
    expiresAt: item.last_redeem_at ?? null,
    branchName: item.branch_name ?? null,
    status: itemStatus(item),
  };
}

export async function loadInventory(): Promise<InventoryData> {
  try {
    const payload = await apiGet<StorageResponse>(
      "/api/customer/storage",
      "required",
    );
    return {
      enabled: payload.enabled !== false,
      memberCode: payload.member_code ?? null,
      items: (payload.items ?? []).map(mapItem),
    };
  } catch (error) {
    redirectIfUnauthorized(error, "/inventory");
    logApiFallback(
      "[inventory] GET /api/customer/storage failed; falling back to mock inventory",
      error,
    );
    return structuredClone(mockInventoryData);
  }
}
