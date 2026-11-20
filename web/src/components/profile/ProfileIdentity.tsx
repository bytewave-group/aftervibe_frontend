"use client";

import { ProfileQrButton } from "@/components/profile/ProfileQrButton";
import { useTranslations } from "@/i18n/locale-provider";
import { TierAvatar } from "@/components/profile/TierAvatar";
import type { CustomerTier } from "@/components/profile/tier";
import type { ProfileData } from "@/lib/mock/profile";

export function ProfileIdentity({
  profile,
  tier = null,
}: {
  profile: ProfileData;
  tier?: CustomerTier | null;
}) {
  const t = useTranslations();

  return (
    <section className="anim-fade-up flex items-center px-6 pt-[28px]">
      <TierAvatar avatar={profile.avatar} tier={tier} />

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
