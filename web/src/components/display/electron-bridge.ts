/**
 * The bridge exposed by apps/customer/electron/preload-main.js (contextBridge "electronAPI") in the Resolume
 * rank overlay window. Electron main fetches /api/rankboard/display + /api/rankboard/settings with the bar token
 * and pushes the results here; the web page never talks to the backend for these.
 */
export type RankEntry = {
  rank?: number;
  name: string;
  amount: number;
  membership?: unknown;
  /** Optional; the current rankboard API does not send this. */
  avatar?: string | null;
  avatar_url?: string | null;
  image?: string | null;
  profile_image_position?: { x: number; y: number } | null;
};

export type RankBoardUpdate = {
  period: "daily" | "weekly" | "monthly";
  ranking: RankEntry[];
  /** Present once Electron forwards it; until then the overlay reads staff rows from settings. */
  staff_ranking?: RankEntry[];
};

export type StaffRankPlacement = {
  enabled: boolean;
  x: number | null;
  y: number | null;
  ranking?: RankEntry[];
};

export type RankPlacement = {
  enabled: boolean;
  position: "left" | "right" | "none" | string;
  x: number | null;
  y: number | null;
};

export type RankBoardSettings = {
  rank_enabled: boolean | number;
  display?: { id: number; name: string; width: number; height: number };
  rankings?: Partial<Record<"daily" | "weekly" | "monthly", RankPlacement>>;
  rank_size?: { width: number; height: number; font_size: number };
  /** Big-screen gift card placement (admin Rank board layout). Null x/y/width = centred default. */
  gift_card?: GiftCardLayout;
  staff_rankings?: Partial<Record<"daily" | "weekly" | "monthly", StaffRankPlacement>>;
  staff_rank_size?: { width: number; height: number; font_size: number };
};

/** Display pixels, top-left of the card; `width` is the card width on the display. */
export type GiftCardLayout = {
  enabled: boolean;
  x: number | null;
  y: number | null;
  width: number | null;
  /** Seconds the card stays on screen. Null/omitted = stay until gift playback ends. */
  duration?: number | null;
};

export type VisualEffectUser = {
  name?: string;
  username?: string | null;
  avatar?: string | null;
  /** Staff receivers: same crop as the web /gifts picker (percent, 0–100). */
  profile_image_position?: { x: number; y: number } | null;
  type?: "customer" | "staff";
};

export type VisualEffectResult = {
  success?: boolean;
  /** Client-side: ×N grew on the same card (combo tap), pop the pill without the intro delay. */
  combo_bump?: boolean;
  mode?: string;
  playlist_id?: number | null;
  count_group?: {
    sender_id?: number | null;
    receiver_customer_id?: number | null;
    receiver_staff_id?: number | null;
    interaction_id?: number | null;
  };
  interaction?: {
    id?: number;
    name?: string;
    showcase_image_url?: string | null;
    quantity?: number;
  } | null;
  displays?: unknown[];
  sender_info?: VisualEffectUser | null;
  receiver_info?: VisualEffectUser | null;
};

type Unsubscribe = (() => void) | void;

export type ElectronDisplayApi = {
  onRankBoard?: (callback: (data: RankBoardUpdate) => void) => Unsubscribe;
  onRankBoardSettings?: (callback: (data: RankBoardSettings) => void) => Unsubscribe;
  onVisualEffect?: (callback: (data: VisualEffectResult) => void) => Unsubscribe;
};

export function electronDisplayApi(): ElectronDisplayApi | null {
  if (typeof window === "undefined") return null;
  const api = (window as unknown as { electronAPI?: ElectronDisplayApi }).electronAPI;
  return api ?? null;
}
