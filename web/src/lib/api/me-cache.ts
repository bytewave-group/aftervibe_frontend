import { apiFetch, ApiError, getStoredToken, onSessionChange } from "@/lib/api/browser";
import type { CustomerPayload, MeResponse } from "@/lib/api/types";
import { DEV_MOCK_TOKEN_PREFIX } from "@/lib/mock/devMode";

export type MeStatus = "guest" | "loading" | "ready" | "error";

export interface MeSnapshot {
  customer: CustomerPayload | null;
  status: MeStatus;
}

const listeners = new Set<() => void>();
let snapshot: MeSnapshot = { customer: null, status: "guest" };
let pending: Promise<CustomerPayload | null> | null = null;
let pendingToken: string | null = null;

function realToken(): string | null {
  const token = getStoredToken();
  if (!token || token.startsWith(DEV_MOCK_TOKEN_PREFIX)) return null;
  return token;
}

function publish(next: MeSnapshot): void {
  snapshot = next;
  for (const listener of listeners) listener();
}

export function getMeSnapshot(): MeSnapshot {
  return snapshot;
}

export function subscribeMe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function resetMe(): void {
  pending = null;
  pendingToken = null;
  publish({ customer: null, status: "guest" });
}

/** Merge fields into the cached customer so other pages see the latest balances. */
export function patchMe(partial: Partial<CustomerPayload>): void {
  if (!snapshot.customer) return;
  publish({
    customer: { ...snapshot.customer, ...partial },
    status: snapshot.status === "guest" ? "ready" : snapshot.status,
  });
}

onSessionChange(resetMe);

/** One in-flight GET /api/customer/me per token. Later callers share the result. */
export function loadMe(force = false): Promise<CustomerPayload | null> {
  const token = realToken();
  if (!token) {
    resetMe();
    return Promise.resolve(null);
  }
  if (!force && snapshot.status === "ready" && snapshot.customer && pendingToken === token) {
    return Promise.resolve(snapshot.customer);
  }
  if (!force && pending && pendingToken === token) return pending;

  pendingToken = token;
  publish({ customer: snapshot.customer, status: "loading" });
  pending = apiFetch<MeResponse>("/api/customer/me", { auth: "required" })
    .then((payload) => {
      if (realToken() !== token) return null;
      if (!payload?.customer) {
        publish({ customer: null, status: "error" });
        return null;
      }
      publish({ customer: payload.customer, status: "ready" });
      return payload.customer;
    })
    .catch((error: unknown) => {
      if (realToken() !== token) return null;
      if (!(error instanceof ApiError && error.status === 401)) {
        console.warn("[profile] GET /api/customer/me failed", error);
      }
      publish({ customer: null, status: "error" });
      return null;
    })
    .finally(() => {
      if (pendingToken === token) pending = null;
    });
  return pending;
}
