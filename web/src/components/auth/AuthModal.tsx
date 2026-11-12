"use client";

import { AuthLoginForm } from "@/components/auth/AuthLoginForm";
import { AuthRegisterForm } from "@/components/auth/AuthRegisterForm";
import { useTranslations } from "@/i18n/locale-provider";
import { useEffect, useId, useRef } from "react";
import { FIGMA_AUTH_BG } from "@/lib/figma-backgrounds";

export type AuthMode = "login" | "register";

interface AuthModalProps {
  mode: AuthMode;
  redirectTo: string;
  onClose: () => void;
  onSwitch: (mode: AuthMode) => void;
  exiting?: boolean;
}

export function AuthModal({ mode, redirectTo, onClose, onSwitch, exiting = false }: AuthModalProps) {
  const t = useTranslations();
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose, mode]);

  const isLogin = mode === "login";

  return (
    <div
      className={`anim-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6 ${exiting ? "is-exit" : ""}`}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`anim-sheet relative w-full max-w-[327px] overflow-hidden rounded-[16px] px-5 pt-5 pb-6 ${exiting ? "is-exit" : ""}`}
        style={{
          background: FIGMA_AUTH_BG,
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 id={titleId} className="text-[20px] leading-none font-bold text-white">
            {isLogin ? t("login.title") : t("register.title")}
          </h2>
          <button
            ref={closeRef}
            type="button"
            className="anim-press -mr-1 flex size-8 items-center justify-center text-white"
            aria-label={t("login.closeAria")}
            onClick={onClose}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
              <path
                d="M3 3l10 10M13 3L3 13"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {isLogin ? (
          <AuthLoginForm redirectTo={redirectTo} />
        ) : (
          <AuthRegisterForm redirectTo={redirectTo} />
        )}

        <div className="mt-6 flex flex-col items-center">
          <button
            type="button"
            className="anim-press text-[16px] leading-none font-bold text-white"
            onClick={() => onSwitch(isLogin ? "register" : "login")}
          >
            {isLogin ? t("login.switchAction") : t("register.switchAction")}
          </button>
          <p className="mt-2 text-[11px] leading-none text-white/45">
            {isLogin ? t("login.switchHint") : t("register.switchHint")}
          </p>
        </div>
      </div>
    </div>
  );
}
