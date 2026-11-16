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
import { apiFetch, ApiError, getStoredToken } from "@/lib/api/browser";
import { avatarUrl } from "@/lib/api/images";
import type { CustomerPayload, MeResponse } from "@/lib/api/types";
import type { ProfileData } from "@/lib/mock/profile";
import { useEffect, useState } from "react";

function mapCustomer(customer: CustomerPayload): ProfileData {
  return {
    id: customer.member_code || String(customer.id),
    username: customer.username,
    name: customer.name,
    phone: customer.phone ?? "",
    memberCode: customer.member_code,
    foodcourtCustomerId: customer.foodcourt_customer_uuid,
    avatar: avatarUrl(customer.profile_image),
    balance: Number(customer.available_balance ?? customer.balance) || 0,
    rewardPoints: Number(customer.reward_points) || 0,
    membership: customer.membership,
  };
}

export function HomeMePane() {
  const t = useTranslations();
  const { isAuthed } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loadedToken, setLoadedToken] = useState<string | null>(null);
  const [failureToken, setFailureToken] = useState<string | null>(null);
  const token = isAuthed ? getStoredToken() : null;

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    void apiFetch<MeResponse>("/api/customer/me", { auth: "required" })
      .then((payload) => {
        if (cancelled) return;
        if (!payload?.customer) {
          setFailureToken(token);
          return;
        }
        setProfile(mapCustomer(payload.customer));
        setLoadedToken(token);
        setFailureToken(null);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        if (!(error instanceof ApiError && error.status === 401)) {
          console.warn("[profile] GET /api/customer/me failed", error);
        }
        setFailureToken(token);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const failed = failureToken === token;
  let body;
  if (!isAuthed || failed) {
    body = (
      <p className="anim-content-fade px-6 pt-[28px] text-[16px] leading-snug font-bold text-white">
        {t("profile.loadError")}
      </p>
    );
  } else if (!profile || loadedToken !== token) {
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
