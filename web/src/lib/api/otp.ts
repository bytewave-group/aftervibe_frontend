/**
 * OTP send / verify seam.
 *
 * TODO: swap these helpers for real SMS endpoints when they are ready
 * (backend has POST /api/customer/otp, and register still checks an OTP
 * field). Until then, keep OTP_MOCK on: send always succeeds, and only
 * MOCK_OTP_CODE verifies.
 */

export const OTP_MOCK = true;
export const MOCK_OTP_CODE = "1234";

export type OtpResult = { ok: true } | { ok: false; error: "invalid" | "network" };

const MOCK_DELAY_MS = 150;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * Request a verification code for `phone` in `countryCode` (ISO, e.g. "MY").
 * Mocked: always succeeds. Do not call the backend from here yet.
 */
export async function sendOtp(phone: string, countryCode: string): Promise<OtpResult> {
  if (!OTP_MOCK) {
    // TODO: POST /api/customer/otp with the composed phone number.
    void phone;
    void countryCode;
    return { ok: false, error: "network" };
  }

  await delay(MOCK_DELAY_MS);
  return { ok: true };
}

/**
 * Confirm a verification code. Mocked: only MOCK_OTP_CODE ("1234") is accepted.
 */
export async function verifyOtp(
  phone: string,
  countryCode: string,
  code: string,
): Promise<OtpResult> {
  if (!OTP_MOCK) {
    // TODO: call a real verify endpoint once it exists.
    void phone;
    void countryCode;
    void code;
    return { ok: false, error: "network" };
  }

  await delay(MOCK_DELAY_MS);
  if (code.trim() === MOCK_OTP_CODE) {
    return { ok: true };
  }
  return { ok: false, error: "invalid" };
}
