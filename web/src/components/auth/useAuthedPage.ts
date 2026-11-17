"use client";

import { useAuth } from "@/components/auth/AuthProvider";
import { loginUrl } from "@/lib/auth/redirect";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";

function useMounted(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

/** Guests are sent to the login modal and returned here after they sign in. */
export function useAuthedPage(): boolean {
  const { isAuthed } = useAuth();
  const mounted = useMounted();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  useEffect(() => {
    if (!mounted || isAuthed) return;
    const qs = params.toString();
    router.replace(loginUrl(`${pathname}${qs ? `?${qs}` : ""}`));
  }, [mounted, isAuthed, pathname, params, router]);

  return mounted && isAuthed;
}
