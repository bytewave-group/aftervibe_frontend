"use client";

import { ProfileQrButton } from "@/components/profile/ProfileQrButton";
import { useTranslations } from "@/i18n/locale-provider";
import { SafeImage } from "@/components/media/SafeImage";
import type { ProfileData } from "@/lib/mock/profile";

export function ProfileIdentity({ profile }: { profile: ProfileData }) {
  const t = useTranslations();

  return (
    <section className="anim-fade-up flex items-center px-6 pt-[28px]">
      <div className="relative size-[55px] shrink-0">
        {/* Ring asset is 59×59 (2px stroke around the 55px avatar). */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/avatar-ring.svg"
          alt=""
          width={59}
          height={59}
          className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
        />
        <div className="absolute top-1/2 left-1/2 size-[51px] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-full bg-[#3a3a3a]">
          {profile.avatar ? (
            <SafeImage
              src={profile.avatar}
              alt=""
              fill
              sizes="51px"
              className="object-cover object-top"
              priority
            />
          ) : null}
        </div>
      </div>

      <div className="ml-[21px] min-w-0 flex-1">
        <p className="truncate text-[16px] leading-none font-bold text-white">
          {profile.username}
        </p>
        <p className="mt-[5px] truncate text-[14px] leading-none font-normal text-white">
          {t("profile.userId", { id: profile.id })}
        </p>
      </div>

      <ProfileQrButton customerId={profile.foodcourtCustomerId} />
    </section>
  );
}
