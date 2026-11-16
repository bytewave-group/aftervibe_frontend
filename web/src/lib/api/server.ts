import "server-only";

import { apiBaseUrl, apiTenantId } from "@/lib/api/env";
import { AUTH_COOKIE_NAME } from "@/lib/auth/cookies";
import { isDevMockEnabled, isDevMockForced, isDevMockSession } from "@/lib/mock/devFallback";
import { DEV_MOCK_ACTION_MESSAGE } from "@/lib/mock/devMode";
import { cookies } from "next/headers";

export class ApiError extends Error {
  readonly status: number;
  readonly payload: unknown;

  constructor(message: string, status: number, payload?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

export type AuthMode = "required" | "optional" | "none";

export type ApiRequestOptions = {
  method?: string;
  auth?: AuthMode;
  body?: unknown;
  formData?: FormData;
  headers?: Record<string, string>;
};

export function getApiBaseUrl(): string {
  const base = apiBaseUrl();
  if (!base) {
    throw new ApiError("NEXT_PUBLIC_API_BASE_URL is not configured.", 500);
  }
  return base;
}

function tenantHeaders(): Record<string, string> {
  const tenantId = apiTenantId();
  return tenantId ? { "X-Tenant-ID": tenantId } : {};
}

async function authHeaders(mode: AuthMode): Promise<Record<string, string>> {
  if (mode === "none") {
    return {};
  }

  const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value;
  if (!token) {
    if (mode === "required") {
      throw new ApiError("Not authenticated.", 401);
    }
    return {};
  }

  return { Authorization: `Bearer ${token}` };
}

function firstValidationError(errors: unknown): string | null {
  if (!errors || typeof errors !== "object") {
    return null;
  }
  const first = Object.values(errors as Record<string, unknown>)[0];
  if (Array.isArray(first) && typeof first[0] === "string" && first[0].trim()) {
    return first[0].trim();
  }
  if (typeof first === "string" && first.trim()) {
    return first.trim();
  }
  return null;
}

function errorMessage(payload: unknown, status: number): string {
  if (payload && typeof payload === "object") {
    const body = payload as { message?: unknown; errors?: unknown };
    if (typeof body.message === "string" && body.message.trim()) {
      return body.message.trim();
    }
    const validation = firstValidationError(body.errors);
    if (validation) {
      return validation;
    }
  }
  return `Request failed with status ${status}`;
}

const DEV_READ_TIMEOUT_MS = 8000;

export async function apiFetch<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const { method = "GET", auth = "optional", body, formData, headers } = options;
  const url = `${getApiBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;
  const isRead = method.toUpperCase() === "GET";

  // Dev-only mock login: never send the fake token. Reads fall back to mock data (503),
  // mutations surface DEV_MOCK_ACTION_MESSAGE (409). Unauthenticated calls (login) still go out.
  if (auth !== "none" && (await isDevMockSession())) {
    throw new ApiError(DEV_MOCK_ACTION_MESSAGE, isRead ? 503 : 409);
  }

  // Dev-only: ?mock=force simulates a backend outage for reads (see src/lib/mock/devFallback.ts).
  if (isRead && (await isDevMockForced())) {
    throw new ApiError("[dev-mock] forced mock mode (add ?mock=off to disable)", 503);
  }

  const res = await fetch(url, {
    method,
    cache: "no-store",
    // Dev-only: don't hang on a dead backend; the read falls back to mock data instead.
    signal: isRead && isDevMockEnabled() ? AbortSignal.timeout(DEV_READ_TIMEOUT_MS) : undefined,
    headers: {
      Accept: "application/json",
      ...tenantHeaders(),
      ...(await authHeaders(auth)),
      ...(formData || body === undefined ? {} : { "Content-Type": "application/json" }),
      ...headers,
    },
    body: formData
      ? formData
      : body !== undefined
        ? JSON.stringify(body)
        : undefined,
  });

  const text = await res.text();
  let payload: unknown = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = { message: text.slice(0, 200) };
    }
  }

  if (!res.ok) {
    throw new ApiError(errorMessage(payload, res.status), res.status, payload);
  }

  return payload as T;
}

export function apiGet<T>(path: string, auth: AuthMode = "optional"): Promise<T> {
  return apiFetch<T>(path, { method: "GET", auth });
}

export function apiPost<T>(
  path: string,
  body?: unknown,
  auth: AuthMode = "optional",
): Promise<T> {
  return apiFetch<T>(path, { method: "POST", auth, body });
}

export function apiDelete<T>(
  path: string,
  auth: AuthMode = "optional",
): Promise<T> {
  return apiFetch<T>(path, { method: "DELETE", auth });
}

