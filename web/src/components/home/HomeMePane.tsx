"use client";

import { useAuth } from "@/components/auth/AuthProvider";
import { PageMain } from "@/components/layout/AppShell";
import { ProfileBodySkeleton } from "@/components/navigation/PageSkeletons";
import { BalanceCard } from "@/components/profile/BalanceCard";
import { LogoutButton } from "@/components/profile/LogoutButton";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { ProfileIdentity } from "@/components/profile/ProfileIdentity";
import { ProfileSettings } from "@/components/profile/ProfileSettings";
import { useTranslations } from "@/i18n/locale-provider";
import { mapCustomerToProfile } from "@/lib/api/profile";

export function HomeMePane() {
  const t = useTranslations();
  const { isAuthed, customer, meStatus } = useAuth();
  const profile = customer ? mapCustomerToProfile(customer) : null;

  let body;
  if (!isAuthed || meStatus === "error" || (meStatus === "ready" && !profile)) {
    body = (
      <p className="anim-content-fade px-6 pt-[28px] text-[16px] leading-snug font-bold text-white">
        {t("profile.loadError")}
      </p>
    );
  } else if (!profile) {
    body = <ProfileBodySkeleton />;
  } else {
    body = (
      <div className="anim-content-fade">
        <ProfileIdentity profile={profile} />
        <BalanceCard balance={profile.balance} />
        <ProfileSettings />
        <LogoutButton />
      </div>
    );
  }

  return (
    <>
      <ProfileHeader showBack={false} />
      <PageMain>{body}</PageMain>
    </>
  );
}
