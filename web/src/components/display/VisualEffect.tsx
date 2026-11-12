"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from "react";
import { electronDisplayApi, type VisualEffectResult, type VisualEffectUser } from "./electron-bridge";
import "./visual-effect.css";

const EXIT_MS = 450;

// Short Chinese role labels (the LED audience is local); were "Sender" / "Receiver".
const ROLE_LABELS = { Sender: "送出", Receiver: "收到" } as const;

// Port of apps/customer/src/components/home/VisualEffect.jsx (Electron path only: data comes from
// window.electronAPI.onVisualEffect; the old browser preview fetched with a bar token, which web must not hold).
/** Combo counts that get a brighter burst on the ×N pill. */
const COMBO_MILESTONES = new Set([10, 66, 99, 188, 520, 999, 1314]);

export function VisualEffect() {
  const [data, setData] = useState<VisualEffectResult | null>(null);
  // Last playing card, kept for EXIT_MS after playback ends so it can animate out.
  const [leaving, setLeaving] = useState<VisualEffectResult | null>(null);
  const playingRef = useRef<VisualEffectResult | null>(null);
  const lastPlaylistIdRef = useRef<number | null>(null);
  const lastCountGroupRef = useRef<string | null>(null);
  // Units of earlier consecutive playlists of the same sender→receiver gift, plus the current one's units
  // (`interaction.quantity` from the backend: combo taps merged into the playlist).
  const baseCountRef = useRef(0);
  const currentUnitsRef = useRef(0);
  // ×N the card opened with; later (combo) bumps pop the pill immediately instead of after the card intro.
  const firstQuantityRef = useRef(0);

  useEffect(() => {
    const api = electronDisplayApi();
    if (!api?.onVisualEffect) return;

    let cancelled = false;
    let leaveTimer: ReturnType<typeof setTimeout> | undefined;

    const processResult = (result: VisualEffectResult) => {
      if (cancelled || !result?.success) return;

      if (result.mode !== "interaction" || !result.playlist_id) {
        if (playingRef.current) {
          setLeaving(playingRef.current);
          clearTimeout(leaveTimer);
          leaveTimer = setTimeout(() => setLeaving(null), EXIT_MS);
          playingRef.current = null;
        }
        lastPlaylistIdRef.current = null;
        lastCountGroupRef.current = null;
        baseCountRef.current = 0;
        currentUnitsRef.current = 0;
        setData(result);
        return;
      }

      const group = result.count_group || {};
      const groupKey = JSON.stringify([
        group.sender_id ?? null,
        group.receiver_customer_id ?? null,
        group.receiver_staff_id ?? null,
        group.interaction_id ?? result.interaction?.id ?? null,
      ]);

      const units = Math.max(1, Math.floor(Number(result.interaction?.quantity) || 1));
      if (lastPlaylistIdRef.current !== result.playlist_id) {
        baseCountRef.current =
          lastCountGroupRef.current === groupKey ? baseCountRef.current + currentUnitsRef.current : 0;
        lastPlaylistIdRef.current = result.playlist_id;
        lastCountGroupRef.current = groupKey;
        currentUnitsRef.current = 0;
        firstQuantityRef.current = baseCountRef.current + units;
      }
      // Same playlist re-pushed (combo-update / 60s poll): only the ×N pill changes, the card stays mounted.
      currentUnitsRef.current = Math.max(currentUnitsRef.current, units);

      const playing = {
        ...result,
        interaction: { ...result.interaction, quantity: baseCountRef.current + currentUnitsRef.current },
        combo_bump: baseCountRef.current + currentUnitsRef.current > firstQuantityRef.current,
      };
      playingRef.current = playing;
      clearTimeout(leaveTimer);
      setLeaving(null);
      setData(playing);
    };

    const unsubscribe = api.onVisualEffect(processResult);
    return () => {
      cancelled = true;
      clearTimeout(leaveTimer);
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, []);

  // The old component rendered a "Loading..." text until the first push; it is invisible on the LED
  // (transparent overlay) only by accident, so render nothing instead.
  if (!data) return null;

  const isPlayingInteraction = data.mode === "interaction";
  const card = isPlayingInteraction ? data : leaving;
  const isLeaving = !isPlayingInteraction && Boolean(leaving);
  const interaction = card?.interaction ?? null;
  const imageUrl = interaction?.showcase_image_url;
  const displays = data.displays || [];

  const avatarUrl = (avatar: unknown) =>
    typeof avatar === "string" && /^https?:\/\//i.test(avatar) ? avatar : null;

  const objectPosition = (position: VisualEffectUser["profile_image_position"]) =>
    position && Number.isFinite(position.x) && Number.isFinite(position.y)
      ? { objectPosition: `${position.x}% ${position.y}%` }
      : undefined;

  const renderUser = (user: VisualEffectUser | null | undefined, role: "Sender" | "Receiver") => {
    const name = user?.name || user?.username || role;
    const src = avatarUrl(user?.avatar);
    return (
      <div className={`visual-effect-user visual-effect-${role.toLowerCase()}`}>
        <div className="visual-effect-ring">
          <div className="visual-effect-avatar">
            {src ? (
              <img
                src={src}
                alt={name}
                className="visual-effect-avatar-image"
                style={objectPosition(user?.profile_image_position)}
              />
            ) : (
              <span className="visual-effect-avatar-initial">{(name.trim()[0] ?? "?").toUpperCase()}</span>
            )}
          </div>
        </div>
        <div className="visual-effect-username">{name}</div>
        <div className="visual-effect-role">{ROLE_LABELS[role]}</div>
      </div>
    );
  };

  const beam = (side: "in" | "out") => (
    <div className={`visual-effect-beam visual-effect-beam-${side}`} aria-hidden="true">
      <span className="visual-effect-beam-track" />
      <span className="visual-effect-beam-spark" />
      <span className="visual-effect-beam-chevron">›</span>
    </div>
  );

  return (
    <div className="visual-effect-page">
      {card ? (
        <div
          key={card.playlist_id || "default"}
          className={`visual-effect-card is-playing${isLeaving ? " is-leaving" : ""}`}
        >
          {renderUser(card.sender_info, "Sender")}
          {beam("in")}
          <div className="visual-effect-gift">
            <div className="visual-effect-media">
              <span className="visual-effect-halo" aria-hidden="true" />
              {imageUrl && (
                <img
                  key={card.playlist_id || imageUrl}
                  src={imageUrl}
                  alt={interaction?.name || "Visual effect"}
                  className="visual-effect-gift-image"
                />
              )}
            </div>
            <div className="visual-effect-gift-name">{interaction?.name || "No active interaction"}</div>
            <div
              key={`quantity-${card.playlist_id}-${interaction?.quantity}`}
              className={`visual-effect-gift-quantity${
                COMBO_MILESTONES.has(interaction?.quantity ?? 1) ? " is-milestone" : ""
              }${card.combo_bump ? " is-combo" : ""}`}
            >
              ×{interaction?.quantity || 1}
            </div>
          </div>
          {beam("out")}
          {renderUser(card.receiver_info, "Receiver")}
        </div>
      ) : null}
      {displays.length === 0 && <div className="visual-effect-status">No display data available</div>}
    </div>
  );
}
