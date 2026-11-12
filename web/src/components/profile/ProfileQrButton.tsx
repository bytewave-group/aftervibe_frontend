"use client";

import { useRequireAuth } from "@/components/auth/useRequireAuth";
import { AppDialog } from "@/components/ui/AppDialog";
import { useTranslations } from "@/i18n/locale-provider";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export function ProfileQrButton({
  customerId,
  className = "anim-press relative z-20 ml-3 flex size-[25px] shrink-0 items-center justify-center",
  authTarget,
}: {
  customerId: string | null;
  className?: string;
  /** When set, logged-out taps open login instead of the QR popup. */
  authTarget?: string;
}) {
  const t = useTranslations();
  const requireAuth = useRequireAuth();
  const [open, setOpen] = useState(false);
  const [canPortal, setCanPortal] = useState(false);

  useEffect(() => {
    setCanPortal(true);
  }, []);

  const dialog = (
    <AppDialog title={t("profile.qrTitle")} open={open} onClose={() => setOpen(false)}>
      {customerId ? (
        <div className="flex flex-col items-center gap-3">
          <div className="rounded-[12px] bg-white p-3 leading-none">
            <QRCodeSVG
              value={customerId}
              size={200}
              level="M"
              marginSize={1}
              bgColor="#ffffff"
              fgColor="#000000"
            />
          </div>
          <p className="text-center text-[12px] leading-snug font-bold text-white/70">
            {t("profile.qrHint")}
          </p>
        </div>
      ) : (
        <p className="text-center text-[14px] leading-snug font-bold text-white">
          {t("profile.qrUnavailable")}
        </p>
      )}
    </AppDialog>
  );

  return (
    <>
      <button
        type="button"
        aria-label={t("profile.qrAria")}
        className={className}
        onClick={() => {
          if (authTarget && !requireAuth(authTarget)) return;
          setOpen(true);
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/icon-qr.svg" alt="" width={25} height={25} />
      </button>
      {canPortal ? createPortal(dialog, document.body) : null}
    </>
  );
}
