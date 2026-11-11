"use client";

import { GiftFlowHeader } from "@/components/gifts/GiftFlowHeader";
import { GiftSearchBar } from "@/components/gifts/GiftSearchBar";
import {
  mergeRecentStaff,
  rememberRecentStaff,
  useRecentStaff,
} from "@/components/gifts/recent";
import { PageMain } from "@/components/layout/AppShell";
import { useInstantNav, usePrefetch } from "@/components/navigation/instant-nav";
import { NAV_FORWARD } from "@/components/navigation/nav-direction";
import { useTranslations } from "@/i18n/locale-provider";
import type { GiftStaff } from "@/lib/mock/gifts";
import { STAFF_PLACEHOLDER_AVATAR } from "@/lib/mock/gifts";
import { useMemo, useState } from "react";

function matchesQuery(staff: GiftStaff, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return staff.number.toLowerCase().includes(q) || staff.name.toLowerCase().includes(q);
}

function StaffAvatar({
  staff,
  ring = false,
  onSelect,
}: {
  staff: GiftStaff;
  ring?: boolean;
  onSelect: (staff: GiftStaff) => void;
}) {
  const position =
    staff.position && Number.isFinite(staff.position.x) && Number.isFinite(staff.position.y)
      ? `${staff.position.x}% ${staff.position.y}%`
      : "center";

  return (
    <button
      type="button"
      data-nav-no-swipe=""
      onClick={() => onSelect(staff)}
      className="anim-press flex w-full flex-col items-center"
    >
      <span
        className={`relative block aspect-square w-full overflow-hidden rounded-full ${
          ring
            ? "ring-2 ring-[#D01F25] ring-offset-2 ring-offset-black/80"
            : "ring-1 ring-white/10"
        }`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={staff.avatar || STAFF_PLACEHOLDER_AVATAR}
          alt=""
          className="size-full object-cover"
          style={{ objectPosition: position }}
        />
      </span>
      <span className="mt-1.5 w-full truncate text-center text-[11px] leading-tight font-semibold text-white">
        {staff.name}
      </span>
      <span className="w-full truncate text-center text-[10px] leading-tight text-white/50">
        {staff.number}
      </span>
    </button>
  );
}

export function StaffSelectClient({
  staffs,
  recents,
}: {
  staffs: GiftStaff[];
  recents: GiftStaff[];
}) {
  const t = useTranslations();
  const { begin } = useInstantNav();
  const [query, setQuery] = useState("");
  const localRecents = useRecentStaff();

  const history = useMemo(
    () => mergeRecentStaff(recents, localRecents),
    [recents, localRecents],
  );
  const filtered = useMemo(
    () => staffs.filter((staff) => matchesQuery(staff, query)),
    [staffs, query],
  );

  usePrefetch(
    staffs.slice(0, 8).map((staff) => `/gifts/${staff.id}`),
  );

  const openStaff = (staff: GiftStaff) => {
    rememberRecentStaff(staff);
    begin(`/gifts/${staff.id}`, NAV_FORWARD);
  };

  return (
    <div
      className="flex min-h-0 flex-1 flex-col"
      style={{
        backgroundImage:
          "linear-gradient(180deg, #1e1e1e 0%, #1e1e1e 45%, #6b1519 100%)",
      }}
    >
      <GiftFlowHeader titleKey="gifts.staffTitle" backHref="/">
        <GiftSearchBar
          value={query}
          onChange={setQuery}
          placeholder={t("gifts.searchNumber")}
        />
      </GiftFlowHeader>
      <PageMain>
        <div className="px-6 pt-4 pb-4">
          {!query.trim() && history.length > 0 ? (
            <section className="mb-6">
              <h2 className="mb-3 text-[14px] font-bold text-white">
                {t("gifts.history")}
              </h2>
              <div className="grid grid-cols-4 gap-x-3">
                {history.map((staff) => (
                  <StaffAvatar
                    key={`recent-${staff.id}`}
                    staff={staff}
                    ring
                    onSelect={openStaff}
                  />
                ))}
              </div>
            </section>
          ) : null}

          <section>
            <h2 className="mb-3 text-[14px] font-bold text-white">
              {t("gifts.searchStaff")}
            </h2>
            {filtered.length === 0 ? (
              <p className="py-10 text-center text-[13px] text-white/50">
                {t("gifts.emptyStaff")}
              </p>
            ) : (
              <div className="grid grid-cols-4 gap-x-3 gap-y-5">
                {filtered.map((staff) => (
                  <StaffAvatar
                    key={staff.id}
                    staff={staff}
                    onSelect={openStaff}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </PageMain>
    </div>
  );
}
