import { displayPosAssetUrl } from "@/lib/api/images";
import { logApiFallback, redirectIfUnauthorized } from "@/lib/api/paginate";
import { apiGet } from "@/lib/api/server";
import type { StorageItemDto, StorageResponse } from "@/lib/api/types";
import { lastRedeemableAt } from "@/lib/format/datetime";
import {
  mockInventoryData,
  type InventoryData,
  type InventoryItem,
  type InventoryStatus,
} from "@/lib/mock/inventory";
import { devMockIfEmpty, devMockOnError } from "@/lib/mock/devFallback";

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
    image: displayPosAssetUrl(
      item.product_image_url || item.image,
      INVENTORY_PLACEHOLDER,
    ),
    quantity: Number(item.quantity) || 0,
    remainingQty: Number(item.remaining_qty) || 0,
    storedAt: item.stored_at || "",
    expiresAt: lastRedeemableAt(item.expired_date, item.last_redeem_at),
    branchName: item.branch_name ?? null,
    code: item.product_code ?? null,
    status: itemStatus(item),
  };
}

export async function loadInventory(): Promise<InventoryData> {
  try {
    const payload = await apiGet<StorageResponse>(
      "/api/customer/storage",
      "required",
    );
    const data: InventoryData = {
      enabled: payload.enabled !== false,
      memberCode: payload.member_code ?? null,
      items: (payload.items ?? []).map(mapItem),
    };
    return devMockIfEmpty("inventory", data, data.enabled && data.items.length === 0, () =>
      structuredClone(mockInventoryData),
    );
  } catch (error) {
    redirectIfUnauthorized(error, "/inventory");
    logApiFallback("[inventory] GET /api/customer/storage failed", error);
    return devMockOnError("inventory", error, () => structuredClone(mockInventoryData), () => ({
      enabled: true,
      memberCode: null,
      items: [],
    }));
  }
}
