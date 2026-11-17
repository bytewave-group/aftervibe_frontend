"use client";

import { useAuth } from "@/components/auth/AuthProvider";
import { useAuthModal } from "@/components/auth/AuthModalProvider";
import { useCallback } from "react";

/**
 * Confirmed guests get the login modal on the current page and this returns
 * false. While auth is still loading it returns false and does not navigate.
 * Authenticated callers get true so they can continue the original action.
 */
export function useRequireAuth() {
  const { status } = useAuth();
  const { openLogin } = useAuthModal();

  return useCallback(
    (target: string = "/") => {
      if (status === "authenticated") return true;
      if (status === "guest") openLogin(target);
      return false;
    },
    [status, openLogin],
  );
}
