"use client";

import { AuthModal, type AuthMode } from "@/components/auth/AuthModal";
import { useAuth } from "@/components/auth/AuthProvider";
import { canonicalPath } from "@/components/navigation/nav-direction";
import { usePresence } from "@/components/ui/usePresence";
import { SESSION_EXPIRED_EVENT } from "@/lib/api/browser";
import { safeRedirectPath } from "@/lib/auth/redirect";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Suspense,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

interface AuthModalContextValue {
  openLogin: (target?: string) => void;
  openRegister: (target?: string) => void;
  close: () => void;
}

const AuthModalContext = createContext<AuthModalContextValue | null>(null);

export function useAuthModal(): AuthModalContextValue {
  const context = useContext(AuthModalContext);
  if (!context) {
    throw new Error("useAuthModal must be used within AuthModalProvider");
  }
  return context;
}

function parseAuthMode(value: string | null): AuthMode | null {
  return value === "login" || value === "register" ? value : null;
}

interface ModalRequest {
  mode: AuthMode;
  redirect: string;
}

function currentLocation(): string {
  if (typeof window === "undefined") return "/";
  const path = canonicalPath(window.location.pathname);
  return window.location.search ? `${path}${window.location.search}` : path;
}

function withoutAuth(href: string): string {
  const queryIndex = href.indexOf("?");
  const path = canonicalPath(queryIndex === -1 ? href : href.slice(0, queryIndex));
  const params = new URLSearchParams(queryIndex === -1 ? "" : href.slice(queryIndex + 1));
  params.delete("auth");
  params.delete("redirect");
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

function AuthModalHost({
  request,
  setRequest,
}: {
  request: ModalRequest | null;
  setRequest: (next: ModalRequest | null) => void;
}) {
  const { status } = useAuth();
  const { close } = useAuthModal();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlMode = parseAuthMode(searchParams.get("auth"));
  const mode = request?.mode ?? urlMode;
  const here = withoutAuth(
    `${canonicalPath(pathname ?? "/")}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`,
  );
  const redirectTo = request?.redirect ?? safeRedirectPath(searchParams.get("redirect"), here);
  const visible = Boolean(mode) && status === "guest";
  const { mounted, exiting } = usePresence(visible);
  const [heldMode, setHeldMode] = useState<AuthMode | null>(mode);
  if (mode && heldMode !== mode) {
    setHeldMode(mode);
  }

  useEffect(() => {
    if (status !== "authenticated" || !mode) return;
    setRequest(null);
    if (withoutAuth(redirectTo) === here) {
      if (urlMode) close();
      return;
    }
    router.replace(redirectTo, { scroll: false });
  }, [status, mode, redirectTo, here, urlMode, router, close, setRequest]);

  const switchMode = useCallback(
    (next: AuthMode) => {
      setRequest({ mode: next, redirect: redirectTo });
      if (!urlMode) return;
      const params = new URLSearchParams(searchParams.toString());
      params.set("auth", next);
      const path = canonicalPath(pathname ?? "/");
      router.replace(`${path}?${params.toString()}`, { scroll: false });
    },
    [pathname, redirectTo, router, searchParams, setRequest, urlMode],
  );

  if (!mounted || !heldMode) {
    return null;
  }

  return (
    <AuthModal
      mode={heldMode}
      redirectTo={redirectTo}
      onClose={close}
      onSwitch={switchMode}
      exiting={exiting}
    />
  );
}

export function AuthModalProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [request, setRequest] = useState<ModalRequest | null>(null);

  const openLogin = useCallback((target?: string) => {
    setRequest({
      mode: "login",
      redirect: safeRedirectPath(target, currentLocation()),
    });
  }, []);

  const openRegister = useCallback((target?: string) => {
    setRequest({
      mode: "register",
      redirect: safeRedirectPath(target, currentLocation()),
    });
  }, []);

  const close = useCallback(() => {
    setRequest(null);
    const params = new URLSearchParams(
      typeof window === "undefined" ? "" : window.location.search,
    );
    if (!params.has("auth") && !params.has("redirect")) return;
    params.delete("auth");
    params.delete("redirect");
    const qs = params.toString();
    const path = canonicalPath(typeof window === "undefined" ? "/" : window.location.pathname);
    router.replace(qs ? `${path}?${qs}` : path, { scroll: false });
  }, [router]);

  useEffect(() => {
    const onExpired = () => {
      openLogin(currentLocation());
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, [openLogin]);

  const value = useMemo(
    () => ({ openLogin, openRegister, close }),
    [openLogin, openRegister, close],
  );

  return (
    <AuthModalContext.Provider value={value}>
      {children}
      <Suspense fallback={null}>
        <AuthModalHost request={request} setRequest={setRequest} />
      </Suspense>
    </AuthModalContext.Provider>
  );
}
