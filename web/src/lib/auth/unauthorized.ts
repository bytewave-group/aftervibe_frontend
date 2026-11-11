import { loginUrl } from "@/lib/auth/redirect";
import { redirect } from "next/navigation";

/** Clear the auth cookie, then send the user to /?auth=login&redirect=<target>. */
export function redirectToLogin(target: string): never {
  const login = loginUrl(target);
  redirect(`/api/auth/clear?redirect=${encodeURIComponent(login)}`);
}
