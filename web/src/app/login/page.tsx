"use client";

import { loginUrl } from "@/lib/auth/redirect";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

function LoginRedirect() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    router.replace(loginUrl(params.get("redirect") ?? undefined));
  }, [router, params]);

  return null;
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginRedirect />
    </Suspense>
  );
}
