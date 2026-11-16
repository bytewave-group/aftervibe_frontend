"use client";

import { useAuth } from "@/components/auth/AuthProvider";
import { sendOtp, verifyOtp } from "@/lib/api/otp";
import {
  COUNTRY_OPTIONS,
  DEFAULT_COUNTRY_ID,
  composePhone,
  isValidNationalNumber,
} from "@/lib/auth/phone";
import { useTranslations } from "@/i18n/locale-provider";
import { useEffect, useState, type FormEvent } from "react";

const ERROR_KEYS: Record<string, string> = {
  missing: "register.errorMissing",
  mismatch: "register.errorPasswordMatch",
  short_password: "register.errorPasswordLength",
  phone: "register.errorPhone",
  otp: "register.errorOtp",
  otp_required: "register.errorOtpRequired",
  phone_taken: "register.errorPhoneTaken",
  username_taken: "register.errorUsernameTaken",
  generic: "register.errorGeneric",
  network: "register.errorNetwork",
};

const fieldClass =
  "h-[44px] w-full rounded-[10px] border border-[#5a5a5a] bg-[#1a1a1a] px-4 text-[14px] text-white outline-none placeholder:text-white/35 focus:border-white/50";

const RESEND_SECONDS = 60;

export function AuthRegisterForm({ redirectTo }: { redirectTo: string }) {
  const t = useTranslations();
  const { register } = useAuth();
  const [countryId, setCountryId] = useState(DEFAULT_COUNTRY_ID);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [pending, setPending] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  void redirectTo;

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = window.setInterval(() => {
      setCountdown((value) => (value <= 1 ? 0 : value - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [countdown]);

  const errorKey = clientError
    ? ERROR_KEYS[clientError] ?? "register.errorGeneric"
    : serverError
      ? (ERROR_KEYS[serverError] ?? "register.errorGeneric")
      : null;

  const handleSendOtp = async () => {
    if (sending || countdown > 0 || pending) return;
    setClientError(null);
    if (!isValidNationalNumber(phone)) {
      setClientError("phone");
      return;
    }
    setSending(true);
    const result = await sendOtp(phone, countryId);
    setSending(false);
    if (!result.ok) {
      setClientError("network");
      return;
    }
    setOtpSent(true);
    setCountdown(RESEND_SECONDS);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending) return;
    const form = event.currentTarget;
    const username = String(new FormData(form).get("username") ?? "").trim();
    const password = String(new FormData(form).get("password") ?? "");
    const confirmation = String(new FormData(form).get("password_confirmation") ?? "");

    setClientError(null);
    setServerError(null);

    if (!username || !password || !confirmation || !phone.trim() || !otp.trim()) {
      setClientError("missing");
      return;
    }
    if (password.length < 6) {
      setClientError("short_password");
      return;
    }
    if (password !== confirmation) {
      setClientError("mismatch");
      return;
    }
    if (!isValidNationalNumber(phone)) {
      setClientError("phone");
      return;
    }
    if (!otpSent) {
      setClientError("otp_required");
      return;
    }

    const verified = await verifyOtp(phone, countryId, otp);
    if (!verified.ok) {
      setClientError("otp");
      return;
    }

    setPending(true);
    const result = await register({
      phone: composePhone(countryId, phone),
      username,
      password,
      passwordConfirmation: confirmation,
      otp,
    });
    setPending(false);
    if (result?.error) {
      setServerError(result.error);
    }
  };

  const composed = composePhone(countryId, phone);

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="mt-5 flex flex-col">
      <input type="hidden" name="redirect" value={redirectTo} />
      <input type="hidden" name="phone" value={composed} />

      <label className="sr-only" htmlFor="auth-register-username">
        {t("register.usernamePlaceholder")}
      </label>
      <input
        id="auth-register-username"
        name="username"
        type="text"
        autoComplete="username"
        required
        placeholder={t("register.usernamePlaceholder")}
        className={fieldClass}
      />

      <label className="sr-only" htmlFor="auth-register-password">
        {t("register.passwordPlaceholder")}
      </label>
      <input
        id="auth-register-password"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        placeholder={t("register.passwordPlaceholder")}
        className={`${fieldClass} mt-3`}
      />

      <label className="sr-only" htmlFor="auth-register-confirm">
        {t("register.confirmPlaceholder")}
      </label>
      <input
        id="auth-register-confirm"
        name="password_confirmation"
        type="password"
        autoComplete="new-password"
        required
        placeholder={t("register.confirmPlaceholder")}
        className={`${fieldClass} mt-3`}
      />

      <div className="mt-3 flex h-[44px] items-center rounded-[10px] border border-[#5a5a5a] bg-[#1a1a1a] focus-within:border-white/50">
        <label className="sr-only" htmlFor="auth-register-country">
          {t("register.countryAria")}
        </label>
        <div className="relative shrink-0">
          <select
            id="auth-register-country"
            value={countryId}
            onChange={(event) => setCountryId(event.target.value)}
            className="h-[44px] appearance-none bg-transparent pr-7 pl-3 text-[13px] leading-none font-bold text-white outline-none"
          >
            {COUNTRY_OPTIONS.map((option) => (
              <option key={option.id} value={option.id} className="bg-[#1a1a1a] text-white">
                {option.label}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-[9px] text-white/70">
            ▾
          </span>
        </div>
        <span className="mx-1 h-5 w-px shrink-0 bg-[#5a5a5a]" />
        <label className="sr-only" htmlFor="auth-register-phone">
          {t("register.phonePlaceholder")}
        </label>
        <input
          id="auth-register-phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          required
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          placeholder={t("register.phonePlaceholder")}
          className="h-full min-w-0 flex-1 bg-transparent pr-3 pl-2 text-[14px] text-white outline-none placeholder:text-white/35"
        />
      </div>

      <div className="mt-3 flex h-[44px] items-center rounded-[10px] border border-[#5a5a5a] bg-[#1a1a1a] focus-within:border-white/50">
        <label className="sr-only" htmlFor="auth-register-otp">
          {t("register.otpPlaceholder")}
        </label>
        <input
          id="auth-register-otp"
          name="otp"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          required
          maxLength={6}
          value={otp}
          onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
          placeholder={t("register.otpPlaceholder")}
          className="h-full min-w-0 flex-1 bg-transparent px-4 text-[14px] text-white outline-none placeholder:text-white/35"
        />
        <button
          type="button"
          disabled={sending || countdown > 0 || pending}
          onClick={() => void handleSendOtp()}
          className="shrink-0 pr-3 text-[13px] leading-none font-bold text-white disabled:text-white/40"
        >
          {sending
            ? t("register.sendingOtp")
            : countdown > 0
              ? t("register.resendOtp", { n: countdown })
              : t("register.sendOtp")}
        </button>
      </div>

      {otpSent && !errorKey ? (
        <p className="mt-3 text-[13px] leading-snug text-[#fda565]" role="status">
          {t("register.otpSent")}
        </p>
      ) : null}

      {errorKey ? (
        <p className="mt-3 text-[13px] leading-snug font-bold text-[#f0454a]" role="alert">
          {t(errorKey)}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="anim-press anim-btn-shimmer mt-5 flex h-[44px] w-full items-center justify-center rounded-[10px] bg-[#d01f25] text-[16px] leading-none font-bold text-white disabled:opacity-70"
      >
        {pending ? t("register.submitting") : t("register.submit")}
      </button>
    </form>
  );
}
