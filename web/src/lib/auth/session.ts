import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME } from "@/lib/auth/cookies";

export async function hasCustomerSession(): Promise<boolean> {
  const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value;
  return Boolean(token && token.length > 0);
}

export async function getCustomerToken(): Promise<string | undefined> {
  return (await cookies()).get(AUTH_COOKIE_NAME)?.value;
}
