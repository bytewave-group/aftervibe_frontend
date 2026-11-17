import { apiBaseUrl, apiTenantId } from "@/lib/api/env";
import { DEV_MOCK_TOKEN_PREFIX } from "@/lib/mock/devMode";

export const TOKEN_STORAGE_KEY = "av_customer_token";
export const SESSION_EXPIRED_EVENT = "session-expired";
export const AUTH_CHANGED_EVENT = "av-auth-changed";

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
  /** When the server returns 401 for a request that sent a bearer token. */
  onUnauthorized?: "expire" | "ignore";
};

const sessionResets: Array<() => void> = [];

/** Drop cached reads when the token is stored or cleared. */
export function onSessionChange(reset: () => void): void {
  sessionResets.push(reset);
}

function notifySessionChange(): void {
  for (const reset of sessionResets) reset();
}

export function getStoredToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  return window.localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setStoredToken(token: string): void {
  window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
  notifySessionChange();
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
}

export function clearStoredToken(): void {
  window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  notifySessionChange();
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
}

function bearerToken(): string | null {
  const token = getStoredToken();
  if (!token || token.startsWith(DEV_MOCK_TOKEN_PREFIX)) {
    return null;
  }
  return token;
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
  return `Request failed (${status})`;
}

export async function apiFetch<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const base = apiBaseUrl();
  if (!base) {
    throw new ApiError("NEXT_PUBLIC_API_BASE_URL is not configured.", 500);
  }

  const auth = options.auth ?? "optional";
  const token = bearerToken();
  if (auth === "required" && !token) {
    throw new ApiError("Not authenticated.", 401);
  }

  const headers: Record<string, string> = { Accept: "application/json" };
  const tenantId = apiTenantId();
  if (tenantId) {
    headers["X-Tenant-ID"] = tenantId;
  }
  if (auth !== "none" && token) {
    headers.Authorization = `Bearer ${token}`;
  }
  if (options.headers) {
    Object.assign(headers, options.headers);
  }

  let body: BodyInit | undefined;
  if (options.formData) {
    body = options.formData;
  } else if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(options.body);
  }

  let response: Response;
  try {
    response = await fetch(`${base}${path.startsWith("/") ? path : `/${path}`}`, {
      method: options.method ?? "GET",
      headers,
      body,
    });
  } catch (error) {
    throw new ApiError(error instanceof Error ? error.message : "Network error", 0);
  }

  const text = await response.text();
  let payload: unknown = null;
  if (text) {
    try {
      payload = JSON.parse(text) as unknown;
    } catch {
      payload = { message: text.slice(0, 200) };
    }
  }

  if (!response.ok) {
    const sentBearer = Boolean(headers.Authorization);
    if (
      response.status === 401 &&
      sentBearer &&
      (options.onUnauthorized ?? "expire") === "expire"
    ) {
      clearStoredToken();
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    }
    throw new ApiError(errorMessage(payload, response.status), response.status, payload);
  }

  return payload as T;
}

export function apiGet<T>(path: string, auth: AuthMode = "optional"): Promise<T> {
  return apiFetch<T>(path, { method: "GET", auth });
}

export function apiPost<T>(path: string, body?: unknown, auth: AuthMode = "optional"): Promise<T> {
  return apiFetch<T>(path, { method: "POST", auth, body });
}

export function apiDelete<T>(path: string, auth: AuthMode = "optional"): Promise<T> {
  return apiFetch<T>(path, { method: "DELETE", auth });
}
