"use server";

import { avatarUrl, displayImageUrl } from "@/lib/api/images";
import { collectPages, logApiFallback, redirectIfUnauthorized } from "@/lib/api/paginate";
import { apiGet, apiPost, ApiError } from "@/lib/api/server";
import type { CustomerGiftDto, CustomerGiftsResponse, MeResponse } from "@/lib/api/types";
import {
  CONFIRM_THRESHOLD,
  GIFT_PLACEHOLDER_IMAGE,
  STAFF_PLACEHOLDER_AVATAR,
  mockGiftBalance,
  mockGiftItems,
  mockGiftStaff,
  mockRecentGiftStaff,
  type GiftBalance,
  type GiftItem,
  type GiftStaff,
} from "@/lib/mock/gifts";
import { revalidatePath } from "next/cache";

export type { GiftBalance, GiftItem, GiftStaff };

type StaffDto = {
  id: number;
  name?: string | null;
  username?: string | null;
  profile_image?: string | null;
  profile_image_position?: { x?: number; y?: number } | null;
};

type StaffListResponse = {
  success?: boolean;
  staffs?: StaffDto[];
  staff?: StaffDto[];
  data?: StaffDto[];
};

type DisplayGiftDto = {
  id?: number;
  name?: string | null;
  interaction?: {
    id?: number;
    name?: string | null;
    amount?: number | string | null;
    image?: unknown;
    requires_confirmation?: boolean;
  } | null;
};

type DisplayGiftResponse = {
  success?: boolean;
  feature?: string;
  displays?: DisplayGiftDto[];
  confirm_threshold?: number;
};

type GiftHistoryRow = CustomerGiftDto & {
  staff_id?: number | null;
  staff_number?: string | null;
};

type GiftHistoryHint = {
  staffId: number | null;
  staffNumber: string;
  name: string;
};

type GiftCatalog = {
  gifts: GiftItem[];
  confirmThreshold: number;
};

type BalanceResponse = {
  success?: boolean;
  balance?: number;
  available_balance?: number;
  reserved_coins?: number;
};

type SendGiftResponse = {
  success?: boolean;
  balance?: number;
  message?: string;
};

export type SendGiftResult =
  | { ok: true; balance: number; available: number }
  | { ok: false; reason: "insufficient"; balance: number; available: number; shortfall: number }
  | { ok: false; reason: "error"; message: string };

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function asNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function mediaPath(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }
  const rec = asRecord(value);
  if (!rec) {
    return null;
  }
  for (const key of ["url", "file_path", "path", "src"]) {
    const item = rec[key];
    if (typeof item === "string" && item.trim()) {
      return item.trim();
    }
  }
  return null;
}

function mapStaff(dto: StaffDto): GiftStaff {
  const x = dto.profile_image_position?.x;
  const y = dto.profile_image_position?.y;
  return {
    id: dto.id,
    name: (dto.name || dto.username || "").trim() || "—",
    number: (dto.username || "").trim(),
    avatar: avatarUrl(dto.profile_image) || STAFF_PLACEHOLDER_AVATAR,
    position:
      typeof x === "number" && typeof y === "number" ? { x, y } : null,
  };
}

function resolveThreshold(value: unknown): number {
  if (value == null || value === "") {
    return CONFIRM_THRESHOLD;
  }
  const n = asNumber(value, CONFIRM_THRESHOLD);
  return n >= 0 ? n : CONFIRM_THRESHOLD;
}

function mapGift(dto: DisplayGiftDto, threshold: number): GiftItem | null {
  const displayId = asNumber(dto.id, 0);
  const interactionId = asNumber(dto.interaction?.id, 0);
  if (!displayId || !interactionId) {
    return null;
  }
  const price = asNumber(dto.interaction?.amount, 0);
  const flag = dto.interaction?.requires_confirmation;
  return {
    displayId,
    interactionId,
    name: (dto.interaction?.name || dto.name || "").trim() || "Gift",
    price,
    image: displayImageUrl(mediaPath(dto.interaction?.image), GIFT_PLACEHOLDER_IMAGE),
    requiresConfirmation: typeof flag === "boolean" ? flag : price >= threshold,
  };
}

function staffListFrom(payload: StaffListResponse): StaffDto[] {
  if (Array.isArray(payload.staffs)) return payload.staffs;
  if (Array.isArray(payload.staff)) return payload.staff;
  if (Array.isArray(payload.data)) return payload.data;
  return [];
}

function recentsFromHistory(staffs: GiftStaff[], rows: GiftHistoryHint[]): GiftStaff[] {
  const byId = new Map(staffs.map((staff) => [staff.id, staff]));
  const byKey = new Map<string, GiftStaff>();
  for (const staff of staffs) {
    if (staff.name.trim()) {
      byKey.set(staff.name.trim().toLowerCase(), staff);
    }
    if (staff.number.trim()) {
      byKey.set(staff.number.trim().toLowerCase(), staff);
    }
  }
  const seen = new Set<number>();
  const recents: GiftStaff[] = [];
  for (const row of rows) {
    const numberKey = row.staffNumber.trim().toLowerCase();
    const nameKey = row.name.trim().toLowerCase();
    const match =
      (row.staffId != null && row.staffId > 0 ? byId.get(row.staffId) : undefined) ??
      (numberKey ? byKey.get(numberKey) : undefined) ??
      (nameKey ? byKey.get(nameKey) : undefined);
    if (!match || seen.has(match.id)) continue;
    seen.add(match.id);
    recents.push(match);
    if (recents.length >= 4) break;
  }
  return recents;
}

async function fetchStaffList(): Promise<GiftStaff[]> {
  const payload = await apiGet<StaffListResponse>("/api/customer/staff", "required");
  return staffListFrom(payload)
    .filter((row) => Number.isFinite(Number(row.id)))
    .map(mapStaff);
}

async function fetchGiftCatalog(): Promise<GiftCatalog> {
  const payload = await apiGet<DisplayGiftResponse>("/api/display/gift", "required");
  const confirmThreshold = resolveThreshold(payload.confirm_threshold);
  return {
    confirmThreshold,
    gifts: (payload.displays ?? [])
      .map((row) => mapGift(row, confirmThreshold))
      .filter((item): item is GiftItem => item !== null),
  };
}

async function fetchBalance(): Promise<GiftBalance> {
  try {
    const payload = await apiGet<BalanceResponse>("/api/customer/balance", "required");
    const balance = asNumber(payload.balance, 0);
    const reserved = asNumber(payload.reserved_coins, 0);
    const available =
      payload.available_balance == null
        ? Math.max(0, balance - reserved)
        : Math.max(0, asNumber(payload.available_balance, 0));
    return { balance, available, reserved };
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      throw error;
    }
    logApiFallback(
      "[gifts] GET /api/customer/balance failed; falling back to /api/customer/me",
      error,
    );
    const me = await apiGet<MeResponse>("/api/customer/me", "required");
    const balance = asNumber(me.customer?.balance, 0);
    return { balance, available: balance, reserved: 0 };
  }
}

async function fetchRecentHistory(): Promise<GiftHistoryHint[]> {
  try {
    const rows = await collectPages(async (page) => {
      const payload = await apiGet<CustomerGiftsResponse>(
        `/api/customer/gifts?page=${page}`,
        "required",
      );
      return payload.gifts ?? {};
    }, 3);
    return rows.map((item: GiftHistoryRow) => ({
      staffId: item.staff_id == null ? null : asNumber(item.staff_id, 0) || null,
      staffNumber: item.staff_number || "",
      name: item.recipient_name || "",
    }));
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      throw error;
    }
    logApiFallback(
      "[gifts] GET /api/customer/gifts failed; recent staff will use local history only",
      error,
    );
    return [];
  }
}

export async function loadStaffSelectPage(): Promise<{
  staffs: GiftStaff[];
  recents: GiftStaff[];
}> {
  try {
    const staffs = await fetchStaffList();
    const history = await fetchRecentHistory();
    return {
      staffs,
      recents: recentsFromHistory(staffs, history),
    };
  } catch (error) {
    redirectIfUnauthorized(error, "/gifts");
    logApiFallback(
      "[gifts] GET /api/customer/staff failed; falling back to mock staff",
      error,
    );
    return {
      staffs: structuredClone(mockGiftStaff),
      recents: structuredClone(mockRecentGiftStaff),
    };
  }
}

export async function loadGiftSelectPage(staffId: number): Promise<{
  staff: GiftStaff | null;
  gifts: GiftItem[];
  balance: GiftBalance;
  confirmThreshold: number;
}> {
  try {
    const [staffs, catalog, balance] = await Promise.all([
      fetchStaffList(),
      fetchGiftCatalog().catch((error) => {
        if (error instanceof ApiError && error.status === 401) {
          throw error;
        }
        logApiFallback(
          "[gifts] GET /api/display/gift failed; falling back to mock gifts",
          error,
        );
        return {
          gifts: structuredClone(mockGiftItems),
          confirmThreshold: CONFIRM_THRESHOLD,
        };
      }),
      fetchBalance(),
    ]);
    return {
      staff: staffs.find((item) => item.id === staffId) ?? null,
      gifts: catalog.gifts,
      balance,
      confirmThreshold: catalog.confirmThreshold,
    };
  } catch (error) {
    redirectIfUnauthorized(error, `/gifts/${staffId}`);
    logApiFallback(
      "[gifts] gift page APIs failed; falling back to mock catalog and balance",
      error,
    );
    const staffs = structuredClone(mockGiftStaff);
    return {
      staff: staffs.find((item) => item.id === staffId) ?? staffs[0] ?? null,
      gifts: structuredClone(mockGiftItems),
      balance: structuredClone(mockGiftBalance),
      confirmThreshold: CONFIRM_THRESHOLD,
    };
  }
}

function insufficientFrom(error: unknown, price: number): SendGiftResult | null {
  if (!(error instanceof ApiError) || error.status !== 422) {
    return null;
  }
  const body = asRecord(error.payload);
  const code = typeof body?.error_code === "string" ? body.error_code : "";
  const message = error.message || "";
  const isCoins =
    code === "INSUFFICIENT_COINS" || /insufficient/i.test(message);
  if (!isCoins) {
    return null;
  }
  const balance = asNumber(body?.balance, 0);
  const available =
    body?.available_balance == null
      ? balance
      : Math.max(0, asNumber(body.available_balance, 0));
  return {
    ok: false,
    reason: "insufficient",
    balance,
    available,
    shortfall: Math.max(1, price - available),
  };
}

export async function sendGiftAction(input: {
  staffId: number;
  displayId: number;
  interactionId: number;
  price: number;
}): Promise<SendGiftResult> {
  const { staffId, displayId, interactionId, price } = input;
  try {
    const current = await fetchBalance();
    if (current.available < price) {
      return {
        ok: false,
        reason: "insufficient",
        balance: current.balance,
        available: current.available,
        shortfall: Math.max(1, price - current.available),
      };
    }

    const payload = await apiPost<SendGiftResponse>(
      "/api/playlists/start",
      {
        display_id: displayId,
        interaction_id: interactionId,
        target: "staff",
        staff_id: staffId,
      },
      "required",
    );
    const balance = asNumber(payload.balance, current.balance);
    revalidatePath("/gifts");
    revalidatePath(`/gifts/${staffId}`);
    revalidatePath("/profile/history");
    return {
      ok: true,
      balance,
      available: Math.max(0, balance - current.reserved),
    };
  } catch (error) {
    redirectIfUnauthorized(error, `/gifts/${staffId}`);
    const insufficient = insufficientFrom(error, price);
    if (insufficient) {
      return insufficient;
    }
    logApiFallback("[gifts] POST /api/playlists/start failed", error);
    return {
      ok: false,
      reason: "error",
      message: error instanceof ApiError ? error.message : "Unable to send this gift.",
    };
  }
}
