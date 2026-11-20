"use client";

/* eslint-disable @next/next/no-img-element */
import { formatInteger } from "@/lib/format/datetime";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { RankEntry } from "./electron-bridge";
import "./rank-board.css";
import { TierFrame } from "./TierFrame";
import { parseTier } from "@/lib/tier";

export type RankPeriod = "daily" | "weekly" | "monthly";

function entryAvatar(user: RankEntry): string | null {
  const value = user.avatar ?? user.avatar_url ?? user.image;
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]!.charAt(0)}${parts[1]!.charAt(0)}`.toUpperCase();
  }
  const single = parts[0] ?? "?";
  return single.slice(0, 2).toUpperCase();
}

function rowKey(user: RankEntry, index: number): string {
  return `${user.rank ?? index}-${user.name}`;
}

function splitTitle(title: string): { kicker: string; heading: string } {
  const trimmed = title.trim();
  const match = trimmed.match(/^(TOP)\s+(.+)$/i);
  if (match) {
    return { kicker: match[1]!.toUpperCase(), heading: match[2]!.toUpperCase() };
  }
  return { kicker: "TOP", heading: trimmed.toUpperCase() || "DAILY" };
}

function useAmountPulses(ranking: RankEntry[]): Set<string> {
  const previous = useRef<Map<string, number>>(new Map());
  const booted = useRef(false);
  const [pulses, setPulses] = useState<Set<string>>(new Set());

  useEffect(() => {
    const nextPulses = new Set<string>();
    if (booted.current) {
      ranking.forEach((user, index) => {
        const key = rowKey(user, index);
        const prior = previous.current.get(key);
        if (prior != null && prior !== user.amount) {
          nextPulses.add(key);
        }
      });
    }
    booted.current = true;
    previous.current = new Map(ranking.map((user, index) => [rowKey(user, index), user.amount]));
    if (nextPulses.size === 0) {
      return;
    }
    setPulses(nextPulses);
    const timer = window.setTimeout(() => setPulses(new Set()), 900);
    return () => window.clearTimeout(timer);
  }, [ranking]);

  return pulses;
}

function Medal({ place }: { place: number }) {
  if (place > 3) {
    return <span className="rb-medal rb-medal--hash" aria-hidden="true" />;
  }
  const label = place === 1 ? "1st" : place === 2 ? "2nd" : "3rd";
  return (
    <span className={`rb-medal rb-medal--${place}`} title={label} aria-hidden="true">
      <svg viewBox="0 0 32 32" width="100%" height="100%">
        <path
          d="M8 4.5h5.2l2.8 6.4L13.2 4.5h5.6L16 10.9 18.8 4.5H24l-5.2 9.2v2.1c2.6.8 4.4 2.6 4.4 4.9 0 3.2-3.2 5.8-7.2 5.8s-7.2-2.6-7.2-5.8c0-2.3 1.8-4.1 4.4-4.9v-2.1L8 4.5Z"
          fill="currentColor"
          stroke="rgba(0,0,0,0.55)"
          strokeWidth="1.15"
          strokeLinejoin="round"
        />
        <circle cx="16" cy="21.2" r="2.6" fill="rgba(255,255,255,0.35)" />
      </svg>
    </span>
  );
}

function Avatar({ user }: { user: RankEntry }) {
  const src = entryAvatar(user);
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(src) && !failed;
  const pos = user.profile_image_position;
  const hasTier = parseTier(user.membership_tier) != null;
  const objectPosition =
    pos && Number.isFinite(pos.x) && Number.isFinite(pos.y) ? `${pos.x}% ${pos.y}%` : undefined;

  const avatar = (
    <span className="rb-avatar" style={hasTier ? { borderColor: "transparent", boxShadow: "none", marginRight: 0 } : undefined}>
      {showImage ? (
        <img src={src!} alt="" onError={() => setFailed(true)} style={objectPosition ? { objectPosition } : undefined} />
      ) : (
        <span className="rb-avatar__initials">{initials(user.name)}</span>
      )}
    </span>
  );
  if (!hasTier) return avatar;

  // Tier frame sits outside .rb-avatar (which clips); small on the board, so static (glow only).
  return (
    <span
      style={{
        position: "relative",
        display: "inline-flex",
        flex: "0 0 auto",
        marginRight: "calc(var(--rb-fs) * 0.35)",
      }}
    >
      {avatar}
      <TierFrame
        value={user.membership_tier}
        ringWidth="calc(var(--rb-fs) * 0.09)"
        outset="calc(var(--rb-fs) * 0.06)"
        emblemSize="calc(var(--rb-fs) * 0.8)"
        glowScale={0.8}
      />
    </span>
  );
}

export function RankBoard({
  ranking,
  title = "TOP",
  fontSize = 16,
  period,
  variant = "customer",
  kicker: kickerProp,
}: {
  ranking: RankEntry[];
  title?: string;
  fontSize?: number;
  period?: RankPeriod;
  variant?: "customer" | "staff";
  kicker?: string;
}) {
  const size = Number(fontSize) || 16;
  const split = splitTitle(title);
  const kicker = kickerProp ?? (variant === "staff" ? "TOP GIRLS" : split.kicker);
  const heading = variant === "staff" ? (period ? period.toUpperCase() : split.heading) : split.heading;
  const pulses = useAmountPulses(ranking);

  return (
    <div
      className="rb-board"
      data-period={period}
      data-variant={variant}
      data-count={ranking.length}
      style={{ "--rb-fs": `${size}px` } as CSSProperties}
    >
      <div className="rb-board__glow" aria-hidden="true" />
      <div className="rb-board__frame" aria-hidden="true" />
      <header className="rb-head">
        <div className="rb-kicker">{kicker}</div>
        <h3 className="rb-title">{heading}</h3>
        <div className="rb-head-line" aria-hidden="true" />
      </header>

      {ranking.length === 0 ? (
        <div className="rb-empty">
          <span className="rb-empty__title">NO RANKING</span>
          <span className="rb-empty__hint">Waiting for players</span>
        </div>
      ) : (
        <ol className="rb-list">
          {ranking.map((user, index) => {
            const place = Number(user.rank) > 0 ? Number(user.rank) : index + 1;
            const podium = place === 1 ? "gold" : place === 2 ? "silver" : place === 3 ? "bronze" : "rest";
            const key = rowKey(user, index);
            const amount = formatInteger(Number(user.amount) || 0);
            return (
              <li
                key={key}
                value={place}
                className={`rb-row rb-row--${podium}${pulses.has(key) ? " is-pulse" : ""}`}
                style={{ animationDelay: `${Math.min(index, 12) * 70}ms` }}
              >
                <span className="rb-place">
                  <Medal place={place} />
                  <span className="rb-num">{String(place).padStart(2, "0")}</span>
                </span>
                <Avatar user={user} />
                <span className="rb-name" title={user.name}>
                  {user.name}
                </span>
                <strong className={`rb-amount${pulses.has(key) ? " is-pulse" : ""}`}>
                  <img className="rb-diamond" src="/images/diamond.png" alt="" />
                  <span className="rb-amount__value">{amount}</span>
                </strong>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
