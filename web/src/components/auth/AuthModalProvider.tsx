"use client";

import { AuthModal, type AuthMode } from "@/components/auth/AuthModal";
import { useAuth } from "@/components/auth/AuthProvider";
import { usePresence } from "@/components/ui/usePresence";
import { loginUrl, registerUrl, safeRedirectPath } from "@/lib/auth/redirect";
import { useRouter, useSearchParams } from "next/navigation";
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

function AuthModalHost() {
  const { isAuthed } = useAuth();
  const { close } = useAuthModal();
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = parseAuthMode(searchParams.get("auth"));
  const redirectTo = safeRedirectPath(searchParams.get("redirect"), "/");
  const visible = Boolean(mode) && !isAuthed;
  const { mounted, exiting } = usePresence(visible);
  const [heldMode, setHeldMode] = useState<AuthMode | null>(mode);
  if (mode && heldMode !== mode) {
    setHeldMode(mode);
  }

  useEffect(() => {
    if (!isAuthed || !mode) return;
    router.replace(redirectTo, { scroll: false });
  }, [isAuthed, mode, redirectTo, router]);

  const switchMode = useCallback(
    (next: AuthMode) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("auth", next);
      const qs = params.toString();
      router.replace(qs ? `/?${qs}` : "/", { scroll: false });
    },
    [router, searchParams],
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

  const openLogin = useCallback(
    (target: string = "/") => {
      router.push(loginUrl(target));
    },
    [router],
  );

  const openRegister = useCallback(
    (target: string = "/") => {
      router.push(registerUrl(target));
    },
    [router],
  );

  const close = useCallback(() => {
    const params = new URLSearchParams(
      typeof window === "undefined" ? "" : window.location.search,
    );
    params.delete("auth");
    params.delete("redirect");
    const qs = params.toString();
    router.replace(qs ? `/?${qs}` : "/", { scroll: false });
  }, [router]);

  const value = useMemo(
    () => ({ openLogin, openRegister, close }),
    [openLogin, openRegister, close],
  );

  return (
    <AuthModalContext.Provider value={value}>
      {children}
      <Suspense fallback={null}>
        <AuthModalHost />
      </Suspense>
    </AuthModalContext.Provider>
  );
}
