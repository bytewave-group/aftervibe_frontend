import { useCallback, useSyncExternalStore } from "react";
import type { GiftStaff } from "@/lib/mock/gifts";

export const RECENT_STAFF_KEY = "av_recent_gift_staff";
export const RECENT_CUSTOMER_KEY = "av_recent_gift_customers";
export const CONFIRM_TOGGLE_KEY = "av_gift_confirm_enabled";

const recentListeners = new Set<() => void>();
const toggleListeners = new Set<() => void>();

const EMPTY_RECENTS: GiftStaff[] = [];
let recentRaw = "__init__";
let recentCache: GiftStaff[] = EMPTY_RECENTS;
let toggleCache: boolean | null = null;

function asStaff(value: unknown): GiftStaff | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const row = value as Partial<GiftStaff>;
  const id = Number(row.id);
  if (!Number.isFinite(id) || id <= 0) {
    return null;
  }
  return {
    id,
    name: typeof row.name === "string" ? row.name : "",
    number: typeof row.number === "string" ? row.number : "",
    avatar: typeof row.avatar === "string" ? row.avatar : "",
    position: row.position ?? null,
  };
}

function parseRecents(raw: string | null): GiftStaff[] {
  if (!raw) {
    return EMPTY_RECENTS;
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return EMPTY_RECENTS;
    }
    const items = parsed
      .map(asStaff)
      .filter((item): item is GiftStaff => item !== null)
      .slice(0, 4);
    return items.length === 0 ? EMPTY_RECENTS : items;
  } catch {
    return EMPTY_RECENTS;
  }
}

export function readRecentStaff(): GiftStaff[] {
  if (typeof window === "undefined") {
    return EMPTY_RECENTS;
  }
  const raw = window.localStorage.getItem(RECENT_STAFF_KEY);
  if (raw === recentRaw) {
    return recentCache;
  }
  recentRaw = raw ?? "";
  recentCache = parseRecents(raw);
  return recentCache;
}

function emitRecent() {
  recentListeners.forEach((listener) => listener());
}

function emitToggle() {
  toggleListeners.forEach((listener) => listener());
}

export function rememberRecentStaff(staff: GiftStaff): GiftStaff[] {
  const next = [staff, ...readRecentStaff().filter((item) => item.id !== staff.id)].slice(0, 4);
  try {
    const raw = JSON.stringify(next);
    window.localStorage.setItem(RECENT_STAFF_KEY, raw);
    recentRaw = raw;
    recentCache = next;
  } catch {
    recentCache = next;
  }
  emitRecent();
  return next;
}

export function mergeRecentStaff(server: GiftStaff[], local: GiftStaff[]): GiftStaff[] {
  const seen = new Set<number>();
  const merged: GiftStaff[] = [];
  for (const staff of [...local, ...server]) {
    if (seen.has(staff.id)) continue;
    seen.add(staff.id);
    merged.push(staff);
    if (merged.length >= 4) break;
  }
  return merged;
}

export function readConfirmToggle(fallback = true): boolean {
  if (typeof window === "undefined") {
    return fallback;
  }
  if (toggleCache !== null) {
    return toggleCache;
  }
  const raw = window.localStorage.getItem(CONFIRM_TOGGLE_KEY);
  if (raw === "0") {
    toggleCache = false;
    return false;
  }
  if (raw === "1") {
    toggleCache = true;
    return true;
  }
  return fallback;
}

export function writeConfirmToggle(enabled: boolean): void {
  toggleCache = enabled;
  try {
    window.localStorage.setItem(CONFIRM_TOGGLE_KEY, enabled ? "1" : "0");
  } catch {
    // Ignore quota / private-mode failures.
  }
  emitToggle();
}

function subscribeRecents(onChange: () => void) {
  recentListeners.add(onChange);
  const onStorage = (event: StorageEvent) => {
    if (event.key === RECENT_STAFF_KEY || event.key === null) {
      recentRaw = "__init__";
      onChange();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    recentListeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

function subscribeToggle(onChange: () => void) {
  toggleListeners.add(onChange);
  const onStorage = (event: StorageEvent) => {
    if (event.key === CONFIRM_TOGGLE_KEY || event.key === null) {
      toggleCache = null;
      onChange();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    toggleListeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

export function useRecentStaff(): GiftStaff[] {
  return useSyncExternalStore(subscribeRecents, readRecentStaff, () => EMPTY_RECENTS);
}

export function useConfirmToggle(fallback = true): [boolean, (enabled: boolean) => void] {
  const enabled = useSyncExternalStore(
    subscribeToggle,
    () => readConfirmToggle(fallback),
    () => fallback,
  );
  const setEnabled = useCallback((value: boolean) => {
    writeConfirmToggle(value);
  }, []);
  return [enabled, setEnabled];
}

const EMPTY_CUSTOMER_RECENTS: GiftStaff[] = [];
let recentCustomerRaw = "__init__";
let recentCustomerCache: GiftStaff[] = EMPTY_CUSTOMER_RECENTS;
const recentCustomerListeners = new Set<() => void>();

function emitRecentCustomers() {
  recentCustomerListeners.forEach((listener) => listener());
}

export function readRecentCustomers(): GiftStaff[] {
  if (typeof window === "undefined") {
    return EMPTY_CUSTOMER_RECENTS;
  }
  const raw = window.localStorage.getItem(RECENT_CUSTOMER_KEY);
  if (raw === recentCustomerRaw) {
    return recentCustomerCache;
  }
  recentCustomerRaw = raw ?? "";
  recentCustomerCache = parseRecents(raw);
  return recentCustomerCache;
}

export function rememberRecentCustomer(customer: GiftStaff): GiftStaff[] {
  const next = [customer, ...readRecentCustomers().filter((item) => item.id !== customer.id)].slice(0, 4);
  try {
    const raw = JSON.stringify(next);
    window.localStorage.setItem(RECENT_CUSTOMER_KEY, raw);
    recentCustomerRaw = raw;
    recentCustomerCache = next;
  } catch {
    recentCustomerCache = next;
  }
  emitRecentCustomers();
  return next;
}

export function mergeRecentCustomers(server: GiftStaff[], local: GiftStaff[]): GiftStaff[] {
  return mergeRecentStaff(server, local);
}

function subscribeRecentCustomers(onChange: () => void) {
  recentCustomerListeners.add(onChange);
  const onStorage = (event: StorageEvent) => {
    if (event.key === RECENT_CUSTOMER_KEY || event.key === null) {
      recentCustomerRaw = "__init__";
      onChange();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    recentCustomerListeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

export function useRecentCustomers(): GiftStaff[] {
  return useSyncExternalStore(
    subscribeRecentCustomers,
    readRecentCustomers,
    () => EMPTY_CUSTOMER_RECENTS,
  );
}
