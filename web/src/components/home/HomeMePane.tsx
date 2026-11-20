"use client";

import { useAuth } from "@/components/auth/AuthProvider";
import { PageMain } from "@/components/layout/AppShell";
import { ProfileBodySkeleton } from "@/components/navigation/PageSkeletons";
import { BalanceCard } from "@/components/profile/BalanceCard";
import { LogoutButton } from "@/components/profile/LogoutButton";
import { PoweredByAfterVibe } from "@/components/common/PoweredByAfterVibe";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { ProfileIdentity } from "@/components/profile/ProfileIdentity";
import { ProfileSettings } from "@/components/profile/ProfileSettings";
import { customerTier } from "@/components/profile/tier";
import { useTranslations } from "@/i18n/locale-provider";
import { mapCustomerToProfile } from "@/lib/api/profile";

export function HomeMePane() {
  const t = useTranslations();
  const { status, customer, meStatus } = useAuth();
  const profile = customer ? mapCustomerToProfile(customer) : null;
  const tier = customerTier(customer);

  let body;
  if (status !== "authenticated" || meStatus === "loading" || meStatus === "guest") {
    body = <ProfileBodySkeleton />;
  } else if (meStatus === "error" || !profile) {
    body = (
      <p className="anim-content-fade px-6 pt-[28px] text-[16px] leading-snug font-bold text-white">
        {t("profile.loadError")}
      </p>
    );
  } else {
    body = (
      <div className="anim-content-fade">
        <ProfileIdentity profile={profile} tier={tier} />
        <BalanceCard balance={profile.balance} tier={tier} />
        <ProfileSettings />
        <LogoutButton />
      </div>
    );
  }

  return (
    <>
      <ProfileHeader showBack={false} />
      <PageMain>
        <div className="flex min-h-full flex-col">
          <div className="flex-1">{body}</div>
          <PoweredByAfterVibe />
        </div>
      </PageMain>
    </>
  );
}
