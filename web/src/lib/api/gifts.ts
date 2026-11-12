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
  mockGiftCustomers,
  mockGiftItems,
  mockGiftStaff,
  mockRecentGiftCustomers,
  mockRecentGiftStaff,
  type GiftBalance,
  type GiftItem,
  type GiftRecipientType,
  type GiftStaff,
} from "@/lib/mock/gifts";
import { devMockIfEmpty, devMockOnError } from "@/lib/mock/devFallback";
import { revalidatePath } from "next/cache";

export type { GiftBalance, GiftItem, GiftRecipientType, GiftStaff };

type StaffDto = {
  id: number;
  name?: string | null;
  username?: string | null;
  profile_image?: string | null;
  profile_image_position?: { x?: number; y?: number } | null;
};

type CustomerDto = {
  id: number;
  username?: string | null;
  name?: string | null;
  avatar?: string | null;
  profile_image?: string | null;
};

type CustomerListResponse = {
  success?: boolean;
  customers?: CustomerDto[];
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
  type: GiftRecipientType;
  staffId: number | null;
  customerId: number | null;
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
  available_balance?: number;
  combo_count?: number;
  message?: string;
};

export type SendGiftResult =
  | { ok: true; balance: number; available: number; comboCount: number }
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

function mapCustomer(dto: CustomerDto): GiftStaff {
  return {
    id: dto.id,
    name: (dto.name || dto.username || "").trim() || "—",
    number: (dto.username || "").trim(),
    avatar: avatarUrl(dto.avatar || dto.profile_image) || STAFF_PLACEHOLDER_AVATAR,
    position: null,
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

function recentsFromHistory(people: GiftStaff[], rows: GiftHistoryHint[]): GiftStaff[] {
  const byId = new Map(people.map((person) => [person.id, person]));
  const byKey = new Map<string, GiftStaff>();
  for (const person of people) {
    if (person.name.trim()) {
      byKey.set(person.name.trim().toLowerCase(), person);
    }
    if (person.number.trim()) {
      byKey.set(person.number.trim().toLowerCase(), person);
    }
  }
  const seen = new Set<number>();
  const recents: GiftStaff[] = [];
  for (const row of rows) {
    const numberKey = row.staffNumber.trim().toLowerCase();
    const nameKey = row.name.trim().toLowerCase();
    const hintedId =
      row.type === "customer"
        ? row.customerId
        : row.staffId;
    const match =
      (hintedId != null && hintedId > 0 ? byId.get(hintedId) : undefined) ??
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

async function fetchCustomerList(): Promise<GiftStaff[]> {
  const payload = await apiGet<CustomerListResponse>("/api/customer/customers", "required");
  return (payload.customers ?? [])
    .filter((row) => Number.isFinite(Number(row.id)))
    .map(mapCustomer);
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
    return rows.map((item: GiftHistoryRow) => {
      const staffId = item.staff_id == null ? null : asNumber(item.staff_id, 0) || null;
      const customerId =
        item.receiver_customer_id == null
          ? null
          : asNumber(item.receiver_customer_id, 0) || null;
      const type: GiftRecipientType =
        item.recipient_type === "customer" || (customerId != null && !staffId)
          ? "customer"
          : "staff";
      return {
        type,
        staffId,
        customerId,
        staffNumber: item.staff_number || "",
        name: item.recipient_name || "",
      };
    });
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
  customers: GiftStaff[];
  customerRecents: GiftStaff[];
}> {
  try {
    const [staffs, customers, history] = await Promise.all([
      fetchStaffList(),
      fetchCustomerList().catch((error) => {
        if (error instanceof ApiError && error.status === 401) {
          throw error;
        }
        logApiFallback(
          "[gifts] GET /api/customer/customers failed",
          error,
        );
        return devMockOnError("gifts.customers", error, () => structuredClone(mockGiftCustomers), () => []);
      }),
      fetchRecentHistory(),
    ]);
    const realStaffs = staffs;
    const shownStaffs = devMockIfEmpty("gifts.staff", realStaffs, realStaffs.length === 0, () =>
      structuredClone(mockGiftStaff),
    );
    return {
      staffs: shownStaffs,
      recents:
        shownStaffs === realStaffs
          ? recentsFromHistory(
              shownStaffs,
              history.filter((row) => row.type === "staff"),
            )
          : structuredClone(mockRecentGiftStaff),
      customers,
      customerRecents: recentsFromHistory(
        customers,
        history.filter((row) => row.type === "customer"),
      ),
    };
  } catch (error) {
    redirectIfUnauthorized(error, "/gifts");
    logApiFallback("[gifts] GET /api/customer/staff failed", error);
    return devMockOnError(
      "gifts.staff",
      error,
      () => ({
        staffs: structuredClone(mockGiftStaff),
        recents: structuredClone(mockRecentGiftStaff),
        customers: structuredClone(mockGiftCustomers),
        customerRecents: structuredClone(mockRecentGiftCustomers),
      }),
      () => ({ staffs: [], recents: [], customers: [], customerRecents: [] }),
    );
  }
}

export async function loadGiftSelectPage(
  recipientId: number,
  recipientType: GiftRecipientType = "staff",
): Promise<{
  staff: GiftStaff | null;
  recipientType: GiftRecipientType;
  gifts: GiftItem[];
  balance: GiftBalance;
  confirmThreshold: number;
}> {
  const recipientPath =
    recipientType === "customer"
      ? `/gifts/customer/${recipientId}`
      : `/gifts/${recipientId}`;
  try {
    const [people, catalog, balance] = await Promise.all([
      recipientType === "customer" ? fetchCustomerList() : fetchStaffList(),
      fetchGiftCatalog().catch((error) => {
        if (error instanceof ApiError && error.status === 401) {
          throw error;
        }
        logApiFallback(
          "[gifts] GET /api/display/gift failed",
          error,
        );
        return devMockOnError<GiftCatalog>(
          "gifts.catalog",
          error,
          () => ({ gifts: structuredClone(mockGiftItems), confirmThreshold: CONFIRM_THRESHOLD }),
          () => ({ gifts: [], confirmThreshold: CONFIRM_THRESHOLD }),
        );
      }),
      fetchBalance(),
    ]);
    const gifts = devMockIfEmpty("gifts.catalog", catalog.gifts, catalog.gifts.length === 0, () =>
      structuredClone(mockGiftItems),
    );
    return {
      staff: people.find((item) => item.id === recipientId) ?? null,
      recipientType,
      gifts,
      balance,
      confirmThreshold: catalog.confirmThreshold,
    };
  } catch (error) {
    redirectIfUnauthorized(error, recipientPath);
    logApiFallback("[gifts] gift page APIs failed", error);
    return devMockOnError(
      "gifts.page",
      error,
      () => {
        const people =
          recipientType === "customer"
            ? structuredClone(mockGiftCustomers)
            : structuredClone(mockGiftStaff);
        return {
          staff: (people.find((item) => item.id === recipientId) ?? people[0] ?? null) as GiftStaff | null,
          recipientType,
          gifts: structuredClone(mockGiftItems),
          balance: structuredClone(mockGiftBalance),
          confirmThreshold: CONFIRM_THRESHOLD,
        };
      },
      () => ({
        staff: null,
        recipientType,
        gifts: [],
        balance: { balance: 0, available: 0, reserved: 0 },
        confirmThreshold: CONFIRM_THRESHOLD,
      }),
    );
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
  staffId?: number;
  recipientId?: number;
  recipientType?: GiftRecipientType;
  displayId: number;
  interactionId: number;
  price: number;
  /** Combo gifting: taps sharing this id merge into one playlist (×N) while it is queued / playing. */
  comboId?: string;
  /** A follow-up combo tap: skip the balance pre-check round trip (the backend still checks every tap). */
  comboTap?: boolean;
}): Promise<SendGiftResult> {
  const recipientType: GiftRecipientType = input.recipientType ?? "staff";
  const recipientId = input.recipientId ?? input.staffId ?? 0;
  const { displayId, interactionId, price } = input;
  const comboId =
    typeof input.comboId === "string" && /^[A-Za-z0-9_-]{1,64}$/.test(input.comboId)
      ? input.comboId
      : undefined;
  const recipientPath =
    recipientType === "customer"
      ? `/gifts/customer/${recipientId}`
      : `/gifts/${recipientId}`;
  try {
    const current = input.comboTap && comboId ? null : await fetchBalance();
    if (current && current.available < price) {
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
        ...(recipientType === "customer"
          ? { target: "customer", receiver_customer_id: recipientId }
          : { target: "staff", staff_id: recipientId }),
        ...(comboId ? { combo_id: comboId } : {}),
      },
      "required",
    );
    const balance = asNumber(payload.balance, current?.balance ?? 0);
    const comboCount = Math.max(1, Math.floor(asNumber(payload.combo_count, 1)));
    // Merged combo taps add no new rows, so only the first send refreshes the cached pages.
    if (comboCount <= 1) {
      revalidatePath("/gifts");
      revalidatePath(recipientPath);
      revalidatePath("/profile/history");
    }
    const available =
      payload.available_balance == null
        ? Math.max(0, balance - (current?.reserved ?? 0) - price)
        : Math.max(0, asNumber(payload.available_balance, 0));
    return { ok: true, balance, available, comboCount };
  } catch (error) {
    redirectIfUnauthorized(error, recipientPath);
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
