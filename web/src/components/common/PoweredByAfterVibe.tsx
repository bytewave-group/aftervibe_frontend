"use client";

/** Subtle developer credit. Pass className to override default spacing. */
export function PoweredByAfterVibe({ className }: { className?: string } = {}) {
  return (
    <div className={`flex justify-center opacity-50 ${className ?? "mt-8 pb-2"}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/aftervibe-logo-h-white.webp"
        alt="AfterVibe"
        width={145}
        height={18}
        className="h-[18px] w-auto"
      />
    </div>
  );
}
