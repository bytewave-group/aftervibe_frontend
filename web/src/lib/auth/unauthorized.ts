import { SESSION_EXPIRED_EVENT } from "@/lib/api/browser";

/** Ask the login modal to open. The browser client already drops a rejected token. */
export function redirectToLogin(target: string): void {
  void target;
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
}
