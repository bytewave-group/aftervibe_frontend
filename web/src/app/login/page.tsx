import { loginUrl } from "@/lib/auth/redirect";
import { redirect } from "next/navigation";

// /login only redirects to /?auth=login; it must not be prerendered.
export const instant = false;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const params = await searchParams;
  redirect(loginUrl(params.redirect));
}
