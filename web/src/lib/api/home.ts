import { apiGet, ApiError } from "@/lib/api/server";
import { avatarUrl, bannerUrl } from "@/lib/api/images";
import type { HomeArtistDto, HomeResponse, HomeSpenderDto } from "@/lib/api/types";
import { hasCustomerSession } from "@/lib/auth/session";
import {
  homeData,
  type Banner,
  type HomeData,
  type MarqueeItem,
  type RankingEntry,
  type RankingListData,
} from "@/lib/mock/home";
import { formatBalance } from "@/lib/mock/profile";

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
  const spenders = (payload.spenders ?? []).map(mapSpender);
  const artists = (payload.artists ?? []).map(mapArtist);

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

  const balance =
    payload.balance == null ? "0.00" : formatBalance(Number(payload.balance));

  return {
    balance,
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

export async function loadHome(): Promise<LoadedHome> {
  const isAuthed = await hasCustomerSession();

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
      data: mapHomeResponse(payload),
      isAuthed,
      source: "api",
    };
  } catch (error) {
    console.warn(
      "[home] GET /api/customer/home failed; falling back to mock home data",
      error instanceof ApiError
        ? { status: error.status, message: error.message }
        : error,
    );
    return {
      data: isAuthed ? homeData : guestMockHome(),
      isAuthed,
      source: "mock",
    };
  }
}
