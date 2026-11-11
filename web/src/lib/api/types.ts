/** Shapes returned by the AfterVibe customer APIs (AvPayload / CustomerAuthController). */

export interface CustomerSummary {
  id: number;
  username: string;
  name: string;
  bar_id: string | number | null;
}

export interface CustomerPayload {
  id: number;
  phone: string | null;
  username: string;
  name: string;
  member_code: string | null;
  profile_image: string | null;
  balance: number;
  reward_points: number;
  membership: string | null;
  created_at: string | null;
  bar_id: string | number | null;
}

export interface LoginResponse {
  success: boolean;
  message?: string;
  token: string;
  customer: CustomerSummary | CustomerPayload;
}

export interface MeResponse {
  success: boolean;
  customer: CustomerPayload;
}

export interface LogoutResponse {
  success: boolean;
  message?: string;
}

export interface RegisterResponse {
  success: boolean;
  message?: string;
  token: string;
  customer: CustomerSummary | CustomerPayload;
}

export interface HomeBannerDto {
  id: number;
  name: string;
  image: string;
}

export interface ImagePosition {
  x: number;
  y: number;
}

export interface HomeSpenderDto {
  rank: number;
  name: string;
  amount: number;
  image: string | null;
  badge?: string | null;
}

export interface HomeArtistDto {
  rank: number;
  name: string;
  gifts: number;
  image: string | null;
  profile_image_position?: ImagePosition | null;
}

export interface HomeResponse {
  success: boolean;
  balance: number | null;
  banners: HomeBannerDto[];
  spenders: HomeSpenderDto[];
  artists: HomeArtistDto[];
}

export interface CheckinRecord {
  id: number;
  customer_id: number;
  check_in_date: string;
  reward: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface CheckinStatusResponse {
  success: boolean;
  checked_in: boolean;
  current_day: number;
  reward: string | null;
  rewards: number[];
  checkin: CheckinRecord | null;
}

export interface CheckinClaimResponse {
  success: boolean;
  message?: string;
  current_day: number;
  reward: string;
  balance: number;
  checkin: CheckinRecord;
}

export interface EventDto {
  id: number;
  title: string;
  description: string | null;
  image_url: string | null;
  schedule_text: string | null;
  starts_at: string | null;
  ends_at: string | null;
  location: string | null;
  is_hot: boolean;
}

export interface EventsResponse {
  success: boolean;
  events: EventDto[];
}

export interface EventShowResponse {
  success: boolean;
  event: EventDto;
  message?: string;
}

export interface SpinPrizeDto {
  type: string;
  amount: number;
  label?: string;
}

export interface SpinWheelResponse {
  success: boolean;
  chances: number;
  daily_chances: number;
  next_spin_seconds: number;
  cost: { coins: number | null; points: number | null };
  balance: number;
  reward_points: number;
  prizes: SpinPrizeDto[];
}

export interface SpinWheelSpinResponse {
  success: boolean;
  message?: string;
  prize_index: number;
  prize: SpinPrizeDto;
  paid_with: string;
  cost_amount: number;
  balance: number;
  reward_points: number;
  chances: number;
}

export interface RewardPackageDto {
  id: number;
  name: string;
  description?: string | null;
  type?: string;
  points_required?: number;
  stock?: number | null;
  media?: { file_path?: string | null; url?: string | null } | null;
}

export interface RewardsResponse {
  success: boolean;
  enabled: boolean;
  packages: RewardPackageDto[];
}

export interface RewardRedeemResponse {
  success: boolean;
  message?: string;
  reward_points: number;
}

export interface StorageHistoryDto {
  uuid?: string;
  type?: string;
  qty?: number;
  created_at?: string;
}

export interface StorageItemDto {
  uuid?: string;
  product_name?: string;
  image?: string | null;
  quantity?: number;
  remaining_qty?: number;
  stored_at?: string | null;
  last_redeem_at?: string | null;
  is_active?: boolean;
  is_expired?: boolean;
  branch_name?: string | null;
  history?: StorageHistoryDto[];
}

export interface StorageResponse {
  success: boolean;
  enabled: boolean;
  member_code?: string | null;
  items?: StorageItemDto[];
  message?: string;
}

export interface BalanceTransactionDto {
  id: number;
  amount: number;
  type: string;
  source?: string | null;
  status?: string;
  description?: string | null;
  created_at?: string | null;
  balance_after?: number;
}

export interface BalanceTransactionsResponse {
  success: boolean;
  transactions: {
    data?: BalanceTransactionDto[];
    current_page?: number;
    last_page?: number;
  };
}

export interface CustomerNotificationDto {
  id: number;
  type?: string;
  title?: string;
  body?: string;
  data?: unknown;
  read_at?: string | null;
  created_at?: string | null;
}

export interface NotificationsResponse {
  success: boolean;
  unread_count: number;
  notifications: {
    data?: CustomerNotificationDto[];
    current_page?: number;
    last_page?: number;
  };
}

export interface ProfileUpdateResponse {
  success: boolean;
  message?: string;
  customer: CustomerPayload;
}

export interface CoinOrderDto {
  order_no: string;
  coins: number;
  amount: number | string;
  currency: string;
  status: string;
  payment_url?: string | null;
  paid_at?: string | null;
  created_at?: string | null;
  /** Not currently in CoinOrderService::toPayload; mapped when present. */
  gateway?: string | null;
}

export interface CoinOrdersResponse {
  success: boolean;
  payment_available?: boolean;
  orders: CoinOrderDto[];
}

export interface CustomerGiftDto {
  id: number;
  sent_at: string | null;
  recipient_name: string;
  gift_name: string;
  quantity: number;
  image: string | null;
}

export interface CustomerGiftsResponse {
  success: boolean;
  gifts: {
    data?: CustomerGiftDto[];
    current_page?: number;
    last_page?: number;
    per_page?: number;
    total?: number;
  };
}
