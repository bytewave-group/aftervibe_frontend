"use client";

import {
  apiFetch,
  ApiError,
  AUTH_CHANGED_EVENT,
  clearStoredToken,
  getStoredToken,
  SESSION_EXPIRED_EVENT,
  setStoredToken,
} from "@/lib/api/browser";
import { getMeSnapshot, loadMe, subscribeMe, type MeSnapshot } from "@/lib/api/me-cache";
import type { CustomerPayload, LoginResponse, LogoutResponse, RegisterResponse } from "@/lib/api/types";
import { DEV_MOCK_TOKEN_PREFIX } from "@/lib/mock/devMode";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";

export type AuthStatus = "loading" | "authenticated" | "guest";

export type AuthResult = { error: string } | null;

interface RegisterInput {
  phone: string;
  username: string;
  password: string;
  passwordConfirmation: string;
  otp: string;
}

interface AuthContextValue {
  status: AuthStatus;
  isAuthed: boolean;
  customer: CustomerPayload | null;
  meStatus: MeSnapshot["status"];
  login: (phone: string, password: string) => Promise<AuthResult>;
  loginDevMock: () => void;
  register: (input: RegisterInput) => Promise<AuthResult>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function registerErrorFromMessage(message: string): string {
  const value = message.toLowerCase();
  if (value.includes("verification code") || value.includes("otp")) {
    return "otp";
  }
  if (value.includes("phone") && value.includes("taken")) {
    return "phone_taken";
  }
  if (value.includes("username") && value.includes("taken")) {
    return "username_taken";
  }
  return "generic";
}

function storeSession(token: string): void {
  setStoredToken(token);
}

function subscribeAuth(onChange: () => void): () => void {
  window.addEventListener(AUTH_CHANGED_EVENT, onChange);
  window.addEventListener(SESSION_EXPIRED_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(AUTH_CHANGED_EVENT, onChange);
    window.removeEventListener(SESSION_EXPIRED_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function authSnapshot(): AuthStatus {
  if (typeof window === "undefined") return "loading";
  return getStoredToken() ? "authenticated" : "guest";
}

const emptyMe: MeSnapshot = { customer: null, status: "guest" };

export function AuthProvider({ children }: { children: ReactNode }) {
  const status = useSyncExternalStore(subscribeAuth, authSnapshot, () => "loading" as AuthStatus);
  const isAuthed = status === "authenticated";
  const me = useSyncExternalStore(subscribeMe, getMeSnapshot, () => emptyMe);

  useEffect(() => {
    if (status !== "authenticated") return;
    void loadMe();
  }, [status]);

  const login = useCallback(async (phone: string, password: string): Promise<AuthResult> => {
    const trimmed = phone.trim();
    if (!trimmed || !password) {
      return { error: "missing" };
    }

    try {
      const payload = await apiFetch<LoginResponse>("/api/customer/login", {
        method: "POST",
        auth: "none",
        body: { phone: trimmed, password },
      });
      if (!payload?.token || typeof payload.token !== "string") {
        return { error: "generic" };
      }
      storeSession(payload.token);
      return null;
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 401) return { error: "credentials" };
        if (error.status === 403) return { error: "inactive" };
        return { error: "generic" };
      }
      return { error: "network" };
    }
  }, []);

  const loginDevMock = useCallback(() => {
    storeSession(`${DEV_MOCK_TOKEN_PREFIX}${Date.now()}`);
  }, []);

  const register = useCallback(async (input: RegisterInput): Promise<AuthResult> => {
    try {
      const payload = await apiFetch<RegisterResponse>("/api/customer/register", {
        method: "POST",
        auth: "none",
        body: {
          phone: input.phone,
          username: input.username,
          name: input.username,
          password: input.password,
          password_confirmation: input.passwordConfirmation,
          otp: input.otp,
        },
      });
      if (!payload?.token || typeof payload.token !== "string") {
        return { error: "generic" };
      }
      storeSession(payload.token);
      return null;
    } catch (error) {
      if (error instanceof ApiError) {
        const code =
          error.payload && typeof error.payload === "object"
            ? (error.payload as { error_code?: unknown }).error_code
            : undefined;
        if (code === "otp_expired") return { error: "otp_expired" };
        if (code === "otp_too_many_attempts") return { error: "otp_attempts" };
        return { error: registerErrorFromMessage(error.message) };
      }
      return { error: "network" };
    }
  }, []);

  const logout = useCallback(async () => {
    const token = getStoredToken();
    if (token && !token.startsWith(DEV_MOCK_TOKEN_PREFIX)) {
      try {
        await apiFetch<LogoutResponse>("/api/customer/logout", {
          method: "POST",
          auth: "optional",
          body: {},
          onUnauthorized: "ignore",
        });
      } catch (error) {
        if (!(error instanceof ApiError && (error.status === 401 || error.status === 403))) {
          console.error("Customer logout failed", error);
        }
      }
    }
    clearStoredToken();
  }, []);

  const value = useMemo(
    () => ({
      status,
      isAuthed,
      customer: me.customer,
      meStatus: me.status,
      login,
      loginDevMock,
      register,
      logout,
    }),
    [status, isAuthed, me, login, loginDevMock, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
