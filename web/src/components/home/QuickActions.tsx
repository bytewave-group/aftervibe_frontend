"use client";

import { GuardedLink } from "@/components/auth/GuardedLink";
import { useCheckin } from "@/components/checkin/CheckinHost";
import { useRequireAuth } from "@/components/auth/useRequireAuth";
import Image from "next/image";
import type { QuickAction } from "@/lib/mock/home";

interface QuickActionsProps {
  actions: (QuickAction & { label: string })[];
  ariaLabel: string;
}

export function QuickActions({ actions, ariaLabel }: QuickActionsProps) {
  const { openCheckin } = useCheckin();
  const requireAuth = useRequireAuth();

  return (
    <nav className="mt-[15px] flex items-start justify-between px-[42px]" aria-label={ariaLabel}>
      {actions.map((action, index) =>
        action.id === "checkin" ? (
          <button
            key={action.id}
            type="button"
            className="anim-press flex min-w-0 flex-1 flex-col items-center"
            onClick={() => {
              if (requireAuth("/?checkin=1")) {
                openCheckin();
              }
            }}
          >
            <ActionIcon action={action} delay={index * 65} />
            <span className="mt-[8px] whitespace-nowrap text-[14px] leading-none font-bold text-white">
              {action.label}
            </span>
          </button>
        ) : (
          <GuardedLink
            key={action.id}
            href={action.href}
            className="flex min-w-0 flex-1 flex-col items-center no-underline"
          >
            <ActionIcon action={action} delay={index * 65} />
            <span className="mt-[8px] whitespace-nowrap text-[14px] leading-none font-bold text-white">
              {action.label}
            </span>
          </GuardedLink>
        ),
      )}
    </nav>
  );
}

function ActionIcon({ action, delay = 0 }: { action: QuickAction; delay?: number }) {
  return (
    <span
      className="anim-bounce-in relative flex size-[45px] items-center justify-center"
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={action.background}
        alt=""
        width={45}
        height={45}
        className="absolute inset-0"
      />
      <Image
        src={action.icon}
        alt=""
        width={action.iconWidth}
        height={action.iconHeight}
        className="relative z-10"
      />
    </span>
  );
}
