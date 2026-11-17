"use client";

import { useAuthedPage } from "@/components/auth/useAuthedPage";
import { PageMain } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { EditProfileBodySkeleton } from "@/components/navigation/PageSkeletons";
import { EditProfileForm } from "@/components/profile/EditProfileForm";
import { useTranslations } from "@/i18n/locale-provider";
import { loadProfileForEdit } from "@/lib/api/profile-edit";
import type { ProfileData } from "@/lib/mock/profile";
import { Suspense, useEffect, useState } from "react";

function EditInner() {
  const ready = useAuthedPage();
  const t = useTranslations();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    void loadProfileForEdit()
      .then((next) => {
        if (!cancelled) setProfile(next);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [ready]);

  return (
    <>
      <PageHeader titleKey="profileEdit.title" backHref="/?tab=me" />
      <PageMain>
        {profile ? (
          <div className="anim-content-fade">
            <EditProfileForm initial={profile} />
          </div>
        ) : failed ? (
          <p className="px-6 pt-10 text-center text-[14px] text-white/60">{t("profile.loadError")}</p>
        ) : (
          <EditProfileBodySkeleton />
        )}
      </PageMain>
    </>
  );
}

export default function EditProfilePage() {
  return (
    <Suspense fallback={<EditProfileBodySkeleton />}>
      <EditInner />
    </Suspense>
  );
}
