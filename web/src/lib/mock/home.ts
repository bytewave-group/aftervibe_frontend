/**
 * Static home chrome and the offline fallback when GET /api/customer/home
 * is unavailable. Quick-action icons and hrefs are UI config, not API data.
 */

export interface Banner {
  id: string;
  image: string;
}

export interface MarqueeItem {
  id: string;
  labelKey: "home.marqueeWealth" | "home.marqueeCharm";
  name: string;
  nameColor: "gold" | "pink";
}

export interface QuickAction {
  id: "checkin" | "spin" | "mall" | "inventory";
  href: string;
  icon: string;
  iconWidth: number;
  iconHeight: number;
  background: string;
}

export type AvatarFit = "top" | "center";
export type RankingMetric = "diamond" | "gift";
export type RankingVariant = "wealth" | "charm";

export interface RankingEntry {
  id: string;
  rank: number;
  name: string;
  avatar: string;
  avatarFit: AvatarFit;
  /** CSS object-position, e.g. "50% 20%". When omitted, avatarFit is used. */
  objectPosition?: string;
  badge?: string;
  amount: number;
}

export interface RankingListData {
  id: RankingVariant;
  variant: RankingVariant;
  metric: RankingMetric;
  entries: RankingEntry[];
}

export interface HomeData {
  balance: string;
  banners: Banner[];
  marqueeItems: MarqueeItem[];
  quickActions: QuickAction[];
  rankings: RankingListData[];
}

export const homeData: HomeData = {
  balance: "10.00",
  banners: [
    { id: "dj-night-1", image: "/images/banner-dj-night.png" },
    { id: "dj-night-2", image: "/images/banner-dj-night.png" },
    { id: "dj-night-3", image: "/images/banner-dj-night.png" },
  ],
  marqueeItems: [
    {
      id: "wealth-leader",
      labelKey: "home.marqueeWealth",
      name: "用户AAA",
      nameColor: "gold",
    },
    {
      id: "charm-leader",
      labelKey: "home.marqueeCharm",
      name: "艺人BBB",
      nameColor: "pink",
    },
  ],
  quickActions: [
    {
      id: "checkin",
      href: "/?checkin=1",
      icon: "/images/icon-checkin.png",
      iconWidth: 30,
      iconHeight: 30,
      background: "/images/action-bg-checkin.svg",
    },
    {
      id: "spin",
      href: "/spin",
      icon: "/images/icon-spin.png",
      iconWidth: 30,
      iconHeight: 30,
      background: "/images/action-bg-spin.svg",
    },
    {
      id: "mall",
      href: "/mall",
      icon: "/images/icon-mall.png",
      iconWidth: 30,
      iconHeight: 30,
      background: "/images/action-bg-mall.svg",
    },
    {
      id: "inventory",
      href: "/inventory",
      icon: "/images/icon-beer.png",
      iconWidth: 26,
      iconHeight: 26,
      background: "/images/action-bg-inventory.svg",
    },
  ],
  rankings: [
    {
      id: "wealth",
      variant: "wealth",
      metric: "diamond",
      entries: [
        {
          id: "w1",
          rank: 1,
          name: "姓名姓名姓名",
          avatar: "/images/avatar-1.png",
          avatarFit: "top",
          badge: "/images/badge-s6.png",
          amount: 9999,
        },
        {
          id: "w2",
          rank: 2,
          name: "姓名姓名姓名",
          avatar: "/images/avatar-2.png",
          avatarFit: "top",
          badge: "/images/badge-s5.png",
          amount: 7999,
        },
        {
          id: "w3",
          rank: 3,
          name: "姓名姓名姓名",
          avatar: "/images/avatar-3.png",
          avatarFit: "center",
          badge: "/images/badge-s6.png",
          amount: 5999,
        },
      ],
    },
    {
      id: "charm",
      variant: "charm",
      metric: "gift",
      entries: [
        {
          id: "c1",
          rank: 1,
          name: "姓名姓名姓名",
          avatar: "/images/avatar-1.png",
          avatarFit: "top",
          badge: "/images/badge-s6.png",
          amount: 169,
        },
        {
          id: "c2",
          rank: 2,
          name: "姓名姓名姓名",
          avatar: "/images/avatar-2.png",
          avatarFit: "top",
          badge: "/images/badge-s5.png",
          amount: 69,
        },
        {
          id: "c3",
          rank: 3,
          name: "姓名姓名姓名",
          avatar: "/images/avatar-4.png",
          avatarFit: "top",
          badge: "/images/badge-s6.png",
          amount: 9,
        },
      ],
    },
  ],
};

export const metricIcons: Record<RankingMetric, string> = {
  diamond: "/images/diamond.png",
  gift: "/images/giftbox.png",
};

export const rankingHeaderClass: Record<RankingVariant, string> = {
  wealth: "bg-[#fda565]",
  charm: "bg-[#fd54b1]",
};

export const nameColorClass: Record<MarqueeItem["nameColor"], string> = {
  gold: "text-[#fda565]",
  pink: "text-[#fd54b1]",
};
