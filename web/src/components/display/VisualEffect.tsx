"use client";

/* eslint-disable @next/next/no-img-element */
import { type CSSProperties, useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  electronDisplayApi,
  type GiftCardLayout,
  type VisualEffectResult,
  type VisualEffectUser,
} from "./electron-bridge";
import "./visual-effect.css";
import { TierFrame, tierAccent } from "./TierFrame";

const EXIT_MS = 450;

// Short Chinese role labels (the LED audience is local); were "Sender" / "Receiver".
const ROLE_LABELS = { Sender: "送出", Receiver: "收到" } as const;

// Port of apps/customer/src/components/home/VisualEffect.jsx (Electron path only: data comes from
// window.electronAPI.onVisualEffect; the old browser preview fetched with a bar token, which web must not hold).
/** Combo counts that get a brighter burst on the ×N pill. */
const COMBO_MILESTONES = new Set([10, 66, 99, 188, 520, 999, 1314]);

/** Natural card width in CSS px (visual-effect.css `.visual-effect-slot`); a positioned card is scaled from it. */
const CARD_NATURAL_WIDTH = 820;

const subscribeResize = (onChange: () => void) => {
  window.addEventListener("resize", onChange);
  return () => window.removeEventListener("resize", onChange);
};
const viewportWidth = () => window.innerWidth;
const serverViewportWidth = () => 0;

type VisualEffectProps = {
  /** From `/rankboard/settings` `gift_card`; missing or null x/y/width = centred default. */
  layout?: GiftCardLayout | null;
  /** Display size in pixels (`/rankboard/settings` `display`), the space `layout` is expressed in. */
  screenWidth?: number;
  screenHeight?: number;
};

/**
 * Placement of a custom-positioned card: left/top as % of the overlay, scaled (transform-origin top left)
 * so its width is `layout.width / screenWidth` of the viewport. Null = keep the centred flex layout.
 */
function slotStyle(
  layout: GiftCardLayout | null | undefined,
  screenWidth: number,
  screenHeight: number,
  viewport: number,
): CSSProperties | null {
  if (!layout || layout.x == null || layout.y == null || !layout.width) return null;
  if (!(screenWidth > 0) || !(screenHeight > 0) || !(viewport > 0)) return null;

  const scale = ((Number(layout.width) / screenWidth) * viewport) / CARD_NATURAL_WIDTH;
  return {
    left: `${(Number(layout.x) / screenWidth) * 100}%`,
    top: `${(Number(layout.y) / screenHeight) * 100}%`,
    transform: `scale(${scale})`,
  };
}

export function VisualEffect({ layout, screenWidth = 0, screenHeight = 0 }: VisualEffectProps = {}) {
  const viewport = useSyncExternalStore(subscribeResize, viewportWidth, serverViewportWidth);
  const [data, setData] = useState<VisualEffectResult | null>(null);
  // Last playing card, kept for EXIT_MS after playback ends so it can animate out.
  const [leaving, setLeaving] = useState<VisualEffectResult | null>(null);
  const playingRef = useRef<VisualEffectResult | null>(null);
  const lastPlaylistIdRef = useRef<number | null>(null);
  const lastCountGroupRef = useRef<string | null>(null);
  // Layout duration is read when a new playlist starts (the visual-effect effect has [] deps).
  const layoutDurationRef = useRef(layout?.duration);
  // After a local hold timer hides the card, polls of the same playlist must not remount it.
  const dismissedPlaylistIdRef = useRef<number | null>(null);
  // Units of earlier consecutive playlists of the same sender→receiver gift, plus the current one's units
  // (`interaction.quantity` from the backend: combo taps merged into the playlist).
  const baseCountRef = useRef(0);
  const currentUnitsRef = useRef(0);
  // ×N the card opened with; later (combo) bumps pop the pill immediately instead of after the card intro.
  const firstQuantityRef = useRef(0);

  useEffect(() => {
    layoutDurationRef.current = layout?.duration;
  }, [layout?.duration]);

  useEffect(() => {
    const api = electronDisplayApi();
    if (!api?.onVisualEffect) return;

    let cancelled = false;
    let leaveTimer: ReturnType<typeof setTimeout> | undefined;
    let holdTimer: ReturnType<typeof setTimeout> | undefined;

    const dismissCard = (payload: VisualEffectResult) => {
      if (playingRef.current) {
        setLeaving(playingRef.current);
        playingRef.current = null;
      }
      clearTimeout(leaveTimer);
      leaveTimer = setTimeout(() => setLeaving(null), EXIT_MS);
      setData(payload);
    };

    const armHoldTimer = (playlistId: number) => {
      clearTimeout(holdTimer);
      const seconds = Number(layoutDurationRef.current);
      if (!Number.isFinite(seconds) || seconds < 1) return;
      holdTimer = setTimeout(() => {
        if (cancelled || !playingRef.current || playingRef.current.playlist_id !== playlistId) return;
        dismissedPlaylistIdRef.current = playlistId;
        dismissCard({
          success: true,
          mode: "default",
          playlist_id: null,
          displays: playingRef.current?.displays || [],
        });
      }, seconds * 1000);
    };

    const processResult = (result: VisualEffectResult) => {
      if (cancelled || !result?.success) return;

      if (result.mode !== "interaction" || !result.playlist_id) {
        clearTimeout(holdTimer);
        dismissedPlaylistIdRef.current = null;
        if (playingRef.current) {
          dismissCard(result);
        } else {
          setData(result);
        }
        lastPlaylistIdRef.current = null;
        lastCountGroupRef.current = null;
        baseCountRef.current = 0;
        currentUnitsRef.current = 0;
        return;
      }

      if (dismissedPlaylistIdRef.current === result.playlist_id) {
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
      const isNewPlaylist = lastPlaylistIdRef.current !== result.playlist_id;
      if (isNewPlaylist) {
        dismissedPlaylistIdRef.current = null;
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
      if (isNewPlaylist) {
        armHoldTimer(result.playlist_id);
      }
    };

    const unsubscribe = api.onVisualEffect(processResult);
    return () => {
      cancelled = true;
      clearTimeout(leaveTimer);
      clearTimeout(holdTimer);
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, []);

  // The old component rendered a "Loading..." text until the first push; it is invisible on the LED
  // (transparent overlay) only by accident, so render nothing instead.
  if (!data) return null;
  // Turned off per display in admin (Rank board layout → Gift card).
  if (layout?.enabled === false) return null;

  const positioned = slotStyle(layout, screenWidth, screenHeight, viewport);

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
    const accent = tierAccent(user?.membership_tier);
    return (
      <div
        className={`visual-effect-user visual-effect-${role.toLowerCase()}`}
        style={accent ? ({ "--ve-accent": accent } as CSSProperties) : undefined}
      >
        <div
          // With a tier, the tier frame replaces the default spinning accent ring (.visual-effect-ring).
          className={accent ? undefined : "visual-effect-ring"}
          style={
            accent
              ? { position: "relative", width: 132, height: 132, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }
              : undefined
          }
        >
          {accent ? <TierFrame value={user?.membership_tier} ringWidth="5px" outset="0px" emblemSize="52px" animate glowScale={2} /> : null}
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

  const cardElement = card ? (
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
  ) : null;

  return (
    <div className={`visual-effect-page${positioned ? " is-positioned" : ""}`}>
      {positioned && cardElement ? (
        <div className="visual-effect-slot" style={positioned}>
          {cardElement}
        </div>
      ) : (
        cardElement
      )}
      {displays.length === 0 && <div className="visual-effect-status">No display data available</div>}
    </div>
  );
}
