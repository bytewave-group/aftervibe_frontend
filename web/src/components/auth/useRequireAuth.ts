"use client";

import { useAuth } from "@/components/auth/AuthProvider";
import { loginUrl } from "@/lib/auth/redirect";
import { useRouter } from "next/navigation";
import { useCallback } from "react";

/**
 * Returns a function that opens the login popup (/?auth=login&redirect=<target>)
 * when the user is logged out, and returns false. When logged in it returns
 * true and does not navigate, so the caller can continue.
 */
export function useRequireAuth() {
  const { isAuthed } = useAuth();
  const router = useRouter();

  return useCallback(
    (target: string = "/") => {
      if (isAuthed) {
        return true;
      }
      router.push(loginUrl(target));
      return false;
    },
    [isAuthed, router],
  );
}
