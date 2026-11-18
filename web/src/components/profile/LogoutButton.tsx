"use client";

import { useAuth } from "@/components/auth/AuthProvider";
import { useAuthModal } from "@/components/auth/AuthModalProvider";
import { useHomeTab } from "@/components/layout/HomeTabProvider";
import { AppDialog } from "@/components/ui/AppDialog";
import { useTranslations } from "@/i18n/locale-provider";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

export function LogoutButton() {
  const t = useTranslations();
  const { logout } = useAuth();
  const { close } = useAuthModal();
  const { setTab } = useHomeTab();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const canPortal = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const confirm = async () => {
    if (busy) return;
    setBusy(true);
    setOpen(false);
    close();
    // Leave the me tab before clearing the token so HomeTabProvider does not
    // open the login modal on /?tab=me.
    setTab("home");
    await logout();
    router.replace("/");
  };

  const dialog = (
    <AppDialog
      title={t("profile.logoutConfirmTitle")}
      open={open}
      onClose={() => {
        if (!busy) setOpen(false);
      }}
      footer={
        <div className="flex gap-3">
          <button
            type="button"
            disabled={busy}
            className="anim-press flex h-[44px] flex-1 items-center justify-center rounded-[10px] bg-white/10 text-[15px] font-bold text-white disabled:opacity-50"
            onClick={() => setOpen(false)}
          >
            {t("common.cancel")}
          </button>
          <button
            type="button"
            disabled={busy}
            className="anim-press anim-btn-shimmer flex h-[44px] flex-1 items-center justify-center rounded-[10px] bg-[#d01f25] text-[15px] font-bold text-white disabled:opacity-50"
            onClick={() => void confirm()}
          >
            {t("profile.logoutConfirm")}
          </button>
        </div>
      }
    >
      {null}
    </AppDialog>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="anim-press anim-btn-shimmer anim-fade-up mx-6 mt-[75px] flex h-[45px] w-[calc(100%-48px)] items-center justify-center rounded-[10px] bg-[red] text-[20px] leading-none font-bold text-white [--stagger:3]"
      >
        {t("profile.logout")}
      </button>
      {canPortal ? createPortal(dialog, document.body) : null}
    </>
  );
}
