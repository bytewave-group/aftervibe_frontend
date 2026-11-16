"use client";

import { useAuth } from "@/components/auth/AuthProvider";
import { useTranslations } from "@/i18n/locale-provider";
import { isDevMockEnabled } from "@/lib/mock/devMode";
import { useState, type FormEvent } from "react";

const ERROR_KEYS: Record<string, string> = {
  missing: "login.errorMissing",
  credentials: "login.errorCredentials",
  inactive: "login.errorInactive",
  generic: "login.errorGeneric",
  network: "login.errorNetwork",
};

const fieldClass =
  "h-[44px] w-full rounded-[10px] border border-[#5a5a5a] bg-[#1a1a1a] px-4 text-[14px] text-white outline-none placeholder:text-white/35 focus:border-white/50";

export function AuthLoginForm({ redirectTo }: { redirectTo: string }) {
  const t = useTranslations();
  const { login, loginDevMock } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  void redirectTo;

  const errorKey = error ? (ERROR_KEYS[error] ?? "login.errorGeneric") : null;

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending) return;
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    if (
      submitter instanceof HTMLButtonElement &&
      submitter.name === "intent" &&
      submitter.value === "dev-mock"
    ) {
      loginDevMock();
      return;
    }

    const form = new FormData(event.currentTarget);
    const phone = String(form.get("phone") ?? "");
    const password = String(form.get("password") ?? "");
    setPending(true);
    const result = await login(phone, password);
    setPending(false);
    setError(result?.error ?? null);
  };

  return (
    <form onSubmit={(event) => void onSubmit(event)} className="mt-5 flex flex-col">
      <label className="sr-only" htmlFor="auth-login-phone">
        {t("login.phone")}
      </label>
      <input
        id="auth-login-phone"
        name="phone"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        required
        placeholder={t("login.phonePlaceholder")}
        className={fieldClass}
      />

      <label className="sr-only" htmlFor="auth-login-password">
        {t("login.password")}
      </label>
      <input
        id="auth-login-password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        placeholder={t("login.passwordPlaceholder")}
        className={`${fieldClass} mt-3`}
      />

      {/* TODO: /forgot-password has no page yet. */}
      <a
        href="/forgot-password"
        className="mt-2 self-end text-[11px] leading-none text-white/55 no-underline"
      >
        {t("login.forgot")}
      </a>

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
        {pending ? t("login.submitting") : t("login.submit")}
      </button>

      {isDevMockEnabled() ? (
        <button
          type="submit"
          name="intent"
          value="dev-mock"
          formNoValidate
          disabled={pending}
          data-dev-mock-login
          className="anim-press mt-3 flex h-[36px] w-full items-center justify-center rounded-[10px] border border-dashed border-amber-400/70 text-[13px] leading-none font-bold text-amber-300 disabled:opacity-70"
        >
          Dev: mock login
        </button>
      ) : null}
    </form>
  );
}
