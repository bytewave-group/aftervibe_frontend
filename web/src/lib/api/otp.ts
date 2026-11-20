import { apiFetch, ApiError } from "@/lib/api/browser";
import { composePhone } from "@/lib/auth/phone";

/**
 * OTP send / verify seam for registration.
 *
 * Real mode (default): POST /api/customer/otp sends a 6-digit code by SMS or
 * WhatsApp. The backend checks and consumes the code inside
 * POST /api/customer/register, so verifyOtp only does a local format check.
 *
 * Set NEXT_PUBLIC_OTP_MOCK=true to go back to the offline mock: send always
 * succeeds and only MOCK_OTP_CODE verifies (register will still hit the
 * backend, which then needs OTP_DEV_CODE=1234 locally).
 */

export const OTP_MOCK = process.env.NEXT_PUBLIC_OTP_MOCK === "true";
export const MOCK_OTP_CODE = "1234";

export type OtpChannel = "sms" | "whatsapp";

export const OTP_CHANNELS: OtpChannel[] = ["sms", "whatsapp"];

export type OtpError =
  | "invalid"
  | "network"
  | "phone_taken"
  | "cooldown"
  | "limit"
  | "send_failed"
  | "unavailable"
  | "generic";

export type OtpResult = { ok: true; resendIn?: number } | { ok: false; error: OtpError; retryAfter?: number };

type OtpSendResponse = {
  success?: boolean;
  channel?: OtpChannel;
  expires_in?: number;
  resend_in?: number;
};

const MOCK_DELAY_MS = 150;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function payloadField(payload: unknown, key: string): unknown {
  return payload && typeof payload === "object" ? (payload as Record<string, unknown>)[key] : undefined;
}

function sendError(error: ApiError): OtpResult {
  const code = payloadField(error.payload, "error_code");
  if (code === "otp_cooldown") {
    const retryAfter = Number(payloadField(error.payload, "retry_after"));
    return { ok: false, error: "cooldown", retryAfter: Number.isFinite(retryAfter) ? retryAfter : undefined };
  }
  if (code === "otp_hourly_limit" || error.status === 429) return { ok: false, error: "limit" };
  if (code === "otp_send_failed") return { ok: false, error: "send_failed" };
  if (code === "otp_channel_disabled" || code === "otp_channel_not_configured") {
    return { ok: false, error: "unavailable" };
  }
  const message = error.message.toLowerCase();
  if (error.status === 422 && message.includes("phone") && message.includes("taken")) {
    return { ok: false, error: "phone_taken" };
  }
  if (error.status === 0) return { ok: false, error: "network" };
  return { ok: false, error: "generic" };
}

/**
 * Channels this venue has enabled and set up (tenant admin → Settings → OTP settings).
 * Falls back to every channel when the list can't be loaded, so the form still works.
 */
export async function fetchOtpChannels(): Promise<OtpChannel[]> {
  if (OTP_MOCK) return OTP_CHANNELS;
  try {
    const payload = await apiFetch<{ channels?: unknown }>("/api/customer/otp/channels", { auth: "none" });
    const list = Array.isArray(payload?.channels) ? payload.channels : null;
    if (!list) return OTP_CHANNELS;
    return OTP_CHANNELS.filter((channel) => list.includes(channel));
  } catch {
    return OTP_CHANNELS;
  }
}

/**
 * Request a verification code for `phone` in `countryCode` (ISO, e.g. "MY") over `channel`.
 */
export async function sendOtp(
  phone: string,
  countryCode: string,
  channel: OtpChannel = "sms",
): Promise<OtpResult> {
  if (OTP_MOCK) {
    await delay(MOCK_DELAY_MS);
    return { ok: true };
  }

  try {
    const payload = await apiFetch<OtpSendResponse>("/api/customer/otp", {
      method: "POST",
      auth: "none",
      body: { phone: composePhone(countryCode, phone), channel },
    });
    return { ok: true, resendIn: typeof payload?.resend_in === "number" ? payload.resend_in : undefined };
  } catch (error) {
    if (error instanceof ApiError) return sendError(error);
    return { ok: false, error: "network" };
  }
}

/**
 * Pre-submit check of a code. Real mode only checks the format; the backend
 * verifies (and consumes) the code during register. Mocked: only MOCK_OTP_CODE.
 */
export async function verifyOtp(
  phone: string,
  countryCode: string,
  code: string,
): Promise<OtpResult> {
  void phone;
  void countryCode;
  const trimmed = code.trim();

  if (!OTP_MOCK) {
    return /^\d{6}$/.test(trimmed) ? { ok: true } : { ok: false, error: "invalid" };
  }

  await delay(MOCK_DELAY_MS);
  if (trimmed === MOCK_OTP_CODE) {
    return { ok: true };
  }
  return { ok: false, error: "invalid" };
}
