import "server-only";

import { AUTH_COOKIE_NAME } from "@/lib/auth/cookies";
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
  const base = process.env.API_BASE_URL?.trim();
  if (!base) {
    throw new ApiError("API_BASE_URL is not configured.", 500);
  }
  return base.replace(/\/+$/, "");
}

function tenantHeaders(): Record<string, string> {
  const tenantId = process.env.API_TENANT_ID?.trim();
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

export async function apiFetch<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const { method = "GET", auth = "optional", body, formData, headers } = options;
  const url = `${getApiBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;

  const res = await fetch(url, {
    method,
    cache: "no-store",
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
