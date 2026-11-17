"use client";

import { GiftFlowHeader } from "@/components/gifts/GiftFlowHeader";
import { GiftSearchBar } from "@/components/gifts/GiftSearchBar";
import {
  mergeRecentCustomers,
  mergeRecentStaff,
  rememberRecentCustomer,
  rememberRecentStaff,
  useRecentCustomers,
  useRecentStaff,
} from "@/components/gifts/recent";
import { PageMain } from "@/components/layout/AppShell";
import { useInstantNav, usePrefetch } from "@/components/navigation/instant-nav";
import { NAV_FORWARD } from "@/components/navigation/nav-direction";
import { useTranslations } from "@/i18n/locale-provider";
import type { GiftRecipientType, GiftStaff } from "@/lib/mock/gifts";
import { STAFF_PLACEHOLDER_AVATAR } from "@/lib/mock/gifts";
import { useMemo, useState } from "react";
import { FIGMA_SHEET_BG } from "@/lib/figma-backgrounds";

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
  customers = [],
  customerRecents = [],
}: {
  staffs: GiftStaff[];
  recents: GiftStaff[];
  customers?: GiftStaff[];
  customerRecents?: GiftStaff[];
}) {
  const t = useTranslations();
  const { begin } = useInstantNav();
  const [tab, setTab] = useState<GiftRecipientType>("staff");
  const [query, setQuery] = useState("");
  const localRecents = useRecentStaff();
  const localCustomerRecents = useRecentCustomers();

  const isCustomerTab = tab === "customer";
  const people = isCustomerTab ? customers : staffs;
  const history = useMemo(
    () =>
      isCustomerTab
        ? mergeRecentCustomers(customerRecents, localCustomerRecents)
        : mergeRecentStaff(recents, localRecents),
    [isCustomerTab, customerRecents, localCustomerRecents, recents, localRecents],
  );
  const filtered = useMemo(
    () => people.filter((person) => matchesQuery(person, query)),
    [people, query],
  );

  usePrefetch([
    ...staffs.slice(0, 8).map((staff) => `/gifts/select?id=${staff.id}&recipient=staff`),
    ...customers.slice(0, 8).map((customer) => `/gifts/select?id=${customer.id}&recipient=customer`),
  ]);

  const openRecipient = (person: GiftStaff) => {
    if (isCustomerTab) {
      rememberRecentCustomer(person);
      begin(`/gifts/select?id=${person.id}&recipient=customer`, NAV_FORWARD);
      return;
    }
    rememberRecentStaff(person);
    begin(`/gifts/select?id=${person.id}&recipient=staff`, NAV_FORWARD);
  };

  const switchTab = (next: GiftRecipientType) => {
    setTab(next);
    setQuery("");
  };

  return (
    <div
      className="flex min-h-0 flex-1 flex-col"
      style={{
        background: FIGMA_SHEET_BG,
      }}
    >
      <GiftFlowHeader
        titleKey={isCustomerTab ? "gifts.customerTitle" : "gifts.staffTitle"}
        backHref="/"
      >
        <div className="mt-3 grid grid-cols-2 gap-1 rounded-full bg-white/10 p-1">
          {([
            ["staff", "gifts.tabStaff"],
            ["customer", "gifts.tabCustomer"],
          ] as const).map(([value, labelKey]) => (
            <button
              key={value}
              type="button"
              data-nav-no-swipe=""
              onClick={() => switchTab(value)}
              className={`anim-press h-[32px] rounded-full text-[13px] leading-none font-bold ${
                tab === value ? "bg-[#d01f25] text-white" : "text-white/70"
              }`}
            >
              {t(labelKey)}
            </button>
          ))}
        </div>
        <GiftSearchBar
          value={query}
          onChange={setQuery}
          placeholder={
            isCustomerTab ? t("gifts.searchCustomer") : t("gifts.searchNumber")
          }
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
                {history.map((person) => (
                  <StaffAvatar
                    key={`recent-${tab}-${person.id}`}
                    staff={person}
                    ring
                    onSelect={openRecipient}
                  />
                ))}
              </div>
            </section>
          ) : null}

          <section>
            <h2 className="mb-3 text-[14px] font-bold text-white">
              {t(isCustomerTab ? "gifts.searchCustomers" : "gifts.searchStaff")}
            </h2>
            {filtered.length === 0 ? (
              <p className="py-10 text-center text-[13px] text-white/50">
                {t(isCustomerTab ? "gifts.emptyCustomers" : "gifts.emptyStaff")}
              </p>
            ) : (
              <div className="grid grid-cols-4 gap-x-3 gap-y-5">
                {filtered.map((person) => (
                  <StaffAvatar
                    key={`${tab}-${person.id}`}
                    staff={person}
                    onSelect={openRecipient}
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
