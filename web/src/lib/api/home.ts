import { apiGet, ApiError } from "@/lib/api/browser";
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
import { parseTier } from "@/lib/tier";
import { devMockIfEmpty, devMockOnError } from "@/lib/mock/devFallback";

export type HomeSource = "api" | "mock";

export interface LoadedHome {
  data: HomeData;
  isAuthed: boolean;
  source: HomeSource;
}


function clampPercent(
  value: number | string | null | undefined,
  fallback: number,
): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(100, Math.max(0, parsed));
}

function objectPositionFromApi(
  position:
    | { x?: number | string | null; y?: number | string | null }
    | null
    | undefined,
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
    tier: parseTier(spender.membership_tier),
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

const HOME_RANK_LIMIT = 3;

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
    {
      id: "wealth",
      variant: "wealth",
      metric: "diamond",
      entries: spenders,
    },
    {
      id: "charm",
      variant: "charm",
      metric: "gift",
      entries: artists,
    },
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

function guestMockHome(): HomeData {
  return {
    ...homeData,
    balance: "0.00",
  };
}

/** Production fallback when the home API fails: real chrome, no fake content. */
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

/** Dev only: fill sections the backend returned empty with mock content. */
function withDevMockSections(data: HomeData): HomeData {
  const banners = devMockIfEmpty("home.banners", data.banners, data.banners.length === 0, () =>
    structuredClone(homeData.banners),
  );
  const noRankings = data.rankings.every((ranking) => ranking.entries.length === 0);
  const rankings = devMockIfEmpty("home.rankings", data.rankings, noRankings, () =>
    structuredClone(homeData.rankings),
  );
  const marqueeItems =
    rankings === data.rankings ? data.marqueeItems : structuredClone(homeData.marqueeItems);
  return { ...data, banners, rankings, marqueeItems };
}

export async function loadHome(): Promise<LoadedHome> {
  try {
    const payload = await apiGet<HomeResponse>("/api/customer/home", "optional");
    if (process.env.NODE_ENV !== "production") {
      console.info("[home] loaded GET /api/customer/home", {
        banners: (payload.banners ?? []).map((banner) => banner.image),
        spenders: (payload.spenders ?? []).map((row) => ({
          name: row.name,
          image: row.image,
        })),
        artists: (payload.artists ?? []).map((row) => ({
          name: row.name,
          image: row.image,
          profile_image_position: row.profile_image_position ?? null,
        })),
      });
    }
    return {
      data: withDevMockSections(mapHomeResponse(payload)),
      isAuthed: false,
      source: "api",
    };
  } catch (error) {
    console.warn(
      "[home] GET /api/customer/home failed",
      error instanceof ApiError
        ? { status: error.status, message: error.message }
        : error,
    );
    return devMockOnError<LoadedHome>(
      "home",
      error,
      () => ({ data: guestMockHome(), isAuthed: false, source: "mock" }),
      () => ({ data: emptyHome(), isAuthed: false, source: "api" }),
    );
  }
}
