"use client";

import { useAuth } from "@/components/auth/AuthProvider";
import { useAuthModal } from "@/components/auth/AuthModalProvider";
import { canonicalPath } from "@/components/navigation/nav-direction";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";

/**
 * Protected pages stay put. While the token is still unknown, render the
 * skeleton and do not navigate. Only a confirmed guest opens the login modal
 * on this page.
 */
export function useAuthedPage(): boolean {
  const { status } = useAuth();
  const { openLogin } = useAuthModal();
  const pathname = canonicalPath(usePathname() ?? "/");
  const params = useSearchParams();
  const search = params.toString();

  useEffect(() => {
    if (status !== "guest") return;
    openLogin(search ? `${pathname}?${search}` : pathname);
  }, [status, pathname, search, openLogin]);

  return status === "authenticated";
}
