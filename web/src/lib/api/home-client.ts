import { apiFetch, ApiError, getStoredToken, onSessionChange } from "@/lib/api/browser";
import { avatarUrl, bannerUrl } from "@/lib/api/images";
import type { HomeArtistDto, HomeResponse, HomeSpenderDto } from "@/lib/api/types";
import {
  homeData,
  type Banner,
  type HomeData,
  type MarqueeItem,
  type RankingEntry,
  type RankingListData,
} from "@/lib/mock/home";
import { formatBalance } from "@/lib/mock/profile";

const HOME_RANK_LIMIT = 3;

function clampPercent(value: number | string | null | undefined, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(100, Math.max(0, parsed));
}

function objectPositionFromApi(
  position: { x?: number | string | null; y?: number | string | null } | null | undefined,
  fallback = "50% 0%",
): string {
  if (!position || (position.x == null && position.y == null)) {
    return fallback;
  }
  return `${clampPercent(position.x, 50)}% ${clampPercent(position.y, 50)}%`;
}

function mapSpender(spender: HomeSpenderDto, index: number): RankingEntry {
  return {
    id: `wealth-${spender.rank}-${index}`,
    rank: spender.rank,
    name: spender.name,
    avatar: spender.image ? avatarUrl(spender.image) : "",
    avatarFit: "center",
    badge: spender.badge || undefined,
    amount: spender.amount,
  };
}

function mapArtist(artist: HomeArtistDto, index: number): RankingEntry {
  return {
    id: `charm-${artist.rank}-${index}`,
    rank: artist.rank,
    name: artist.name,
    avatar: artist.image ? avatarUrl(artist.image) : "",
    avatarFit: "center",
    objectPosition: objectPositionFromApi(artist.profile_image_position),
    amount: artist.gifts,
  };
}

function mapHomeResponse(payload: HomeResponse): HomeData {
  const spenders = (payload.spenders ?? []).slice(0, HOME_RANK_LIMIT).map(mapSpender);
  const artists = (payload.artists ?? []).slice(0, HOME_RANK_LIMIT).map(mapArtist);

  const marqueeItems: MarqueeItem[] = [];
  if (spenders[0]) {
    marqueeItems.push({
      id: "wealth-leader",
      labelKey: "home.marqueeWealth",
      name: spenders[0].name,
      nameColor: "gold",
    });
  }
  if (artists[0]) {
    marqueeItems.push({
      id: "charm-leader",
      labelKey: "home.marqueeCharm",
      name: artists[0].name,
      nameColor: "pink",
    });
  }

  const banners: Banner[] = (payload.banners ?? []).map((banner) => ({
    id: String(banner.id),
    image: bannerUrl(banner.image),
  }));

  const rankings: RankingListData[] = [
    { id: "wealth", variant: "wealth", metric: "diamond", entries: spenders },
    { id: "charm", variant: "charm", metric: "gift", entries: artists },
  ];

  const amount = payload.available_balance ?? payload.balance;
  const balance = amount == null ? "0.00" : formatBalance(Number(amount));

  return {
    balance,
    foodcourtCustomerId: payload.foodcourt_customer_uuid ?? null,
    banners,
    marqueeItems,
    quickActions: homeData.quickActions,
    rankings,
  };
}

function emptyHome(): HomeData {
  return {
    ...homeData,
    balance: "0.00",
    foodcourtCustomerId: null,
    banners: [],
    marqueeItems: [],
    rankings: homeData.rankings.map((ranking) => ({ ...ranking, entries: [] })),
  };
}

let homeCache: { token: string | null; data: HomeData } | null = null;
let homePending: Promise<HomeData> | null = null;
let homePendingToken: string | null | undefined;

function rememberHome(token: string | null, data: HomeData): HomeData {
  homeCache = { token, data };
  return data;
}

onSessionChange(() => {
  homeCache = null;
  homePending = null;
  homePendingToken = undefined;
});

export async function loadHomeClient(): Promise<HomeData> {
  const token = getStoredToken();
  if (homeCache && homeCache.token === token) return homeCache.data;
  if (homePending && homePendingToken === token) return homePending;

  homePendingToken = token;
  homePending = (async () => {
    try {
      const payload = await apiFetch<HomeResponse>("/api/customer/home", { auth: "optional" });
      return rememberHome(token, mapHomeResponse(payload));
    } catch (error) {
      console.warn(
        "[home] GET /api/customer/home failed",
        error instanceof ApiError ? { status: error.status, message: error.message } : error,
      );
      return rememberHome(token, emptyHome());
    } finally {
      if (homePendingToken === token) homePending = null;
    }
  })();
  return homePending;
}
