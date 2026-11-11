import { PageMain } from "@/components/layout/AppShell";
import { ProfileBodySkeleton } from "@/components/navigation/PageSkeletons";
import { BalanceCard } from "@/components/profile/BalanceCard";
import { LogoutButton } from "@/components/profile/LogoutButton";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { ProfileIdentity } from "@/components/profile/ProfileIdentity";
import { ProfileSettings } from "@/components/profile/ProfileSettings";
import { getT } from "@/i18n/get-locale";
import { ApiError } from "@/lib/api/server";
import { loadProfile } from "@/lib/api/profile";
import { hasCustomerSession } from "@/lib/auth/session";
import type { ProfileData } from "@/lib/mock/profile";
import { Suspense } from "react";

async function loadProfileOrNull(): Promise<ProfileData | null> {
  try {
    return await loadProfile();
  } catch (error) {
    if (error instanceof ApiError) {
      return null;
    }
    throw error;
  }
}

async function ProfilePanelContent() {
  const { t } = await getT();
  const isAuthed = await hasCustomerSession();
  const profile = isAuthed ? await loadProfileOrNull() : null;

  if (!profile) {
    return (
      <p className="anim-content-fade px-6 pt-[28px] text-[16px] leading-snug font-bold text-white">
        {t("profile.loadError")}
      </p>
    );
  }

  return (
    <div className="anim-content-fade">
      <ProfileIdentity profile={profile} />
      <BalanceCard balance={profile.balance} />
      <ProfileSettings profile={profile} />
      <LogoutButton />
    </div>
  );
}

export function ProfilePanel({ showBack = false }: { showBack?: boolean }) {
  return (
    <>
      <ProfileHeader showBack={showBack} />
      <PageMain>
        <Suspense fallback={<ProfileBodySkeleton />}>
          <ProfilePanelContent />
        </Suspense>
      </PageMain>
    </>
  );
}
