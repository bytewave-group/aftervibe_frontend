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
  foodcourt_customer_uuid: string | null;
  profile_image: string | null;
  balance: number;
  available_balance?: number;
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
  available_balance?: number | null;
  foodcourt_customer_uuid?: string | null;
  banners: HomeBannerDto[];
  spenders: HomeSpenderDto[];
  artists: HomeArtistDto[];
}

export interface RewardPackageSummary {
  id: number;
  name: string;
  image: string | null;
}

export interface RewardGrantDto {
  type: string;
  amount: number;
  amount_min?: number | null;
  amount_max?: number | null;
  label: string;
  package?: RewardPackageSummary | null;
}

export interface CheckinRecord {
  id: number;
  customer_id: number;
  check_in_date: string;
  reward: string | null;
  cycle_day?: number | null;
  reward_type?: string | null;
  reward_amount?: number | null;
  reward_package_id?: number | null;
  bonus_type?: string | null;
  bonus_amount?: number | null;
  bonus_package_id?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface CheckinStatusResponse {
  success: boolean;
  checked_in: boolean;
  current_day: number;
  cycle_length?: number;
  mode?: string;
  streak_count?: number;
  campaign_active?: boolean;
  campaign_starts_at?: string | null;
  campaign_ends_at?: string | null;
  bonus_day?: number | null;
  bonus?: RewardGrantDto | null;
  reward: string | null;
  rewards: Array<RewardGrantDto | number> | Record<string, RewardGrantDto | number>;
  checkin: CheckinRecord | null;
  grant?: RewardGrantDto;
  bonus_grant?: RewardGrantDto | null;
  balance?: number;
  reward_points?: number;
}

export interface CheckinClaimResponse extends CheckinStatusResponse {
  message?: string;
  reward: string;
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
  likes_count?: number;
  comments_count?: number;
  liked_by_me?: boolean;
}

export interface EventCommentAuthorDto {
  id: number;
  name: string;
  avatar_url: string | null;
}

export interface EventCommentDto {
  id: number;
  body: string;
  created_at: string | null;
  mine: boolean;
  customer: EventCommentAuthorDto;
}

export interface EventCommentsPage {
  data: EventCommentDto[];
  current_page: number;
  last_page: number;
  total: number;
}

export interface EventCommentsResponse {
  success: boolean;
  comments: EventCommentsPage;
}

export interface EventLikeResponse {
  success: boolean;
  liked: boolean;
  likes_count: number;
}

export interface EventCommentMutationResponse {
  success: boolean;
  comment?: EventCommentDto;
  comments_count: number;
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
  amount_min?: number | null;
  amount_max?: number | null;
  label?: string;
  package?: RewardPackageSummary | null;
}

export interface SpinWheelResponse {
  success: boolean;
  chances: number;
  daily_chances: number;
  free_spin_period?: "daily" | "weekly";
  next_spin_seconds: number;
  cost: { coins: number | null; points: number | null };
  balance: number;
  available_balance?: number | null;
  reward_points: number;
  paid_spins_remaining?: number | null;
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
  available_balance?: number | null;
  reward_points: number;
  chances: number;
  paid_spins_remaining?: number | null;
}

export interface RewardPackageDto {
  id: number;
  name: string;
  description?: string | null;
  type?: string;
  points_required?: number;
  stock?: number | null;
  image_url?: string | null;
  image_path?: string | null;
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
  product_image_url?: string | null;
  product_code?: string | null;
  quantity?: number;
  remaining_qty?: number;
  stored_at?: string | null;
  last_redeem_at?: string | null;
  expired_date?: string | null;
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

export type PaymentMethodCategory = "bank" | "ewallet" | "card";

export interface CoinOrderPaymentMethodDto {
  category: PaymentMethodCategory | null;
  provider: string | null;
}

export interface CoinOrderDto {
  id?: number;
  order_no: string;
  coins: number;
  bonus_coins?: number;
  amount: number | string;
  currency: string;
  status: string;
  payment_url?: string | null;
  paid_at?: string | null;
  created_at?: string | null;
  payment_method?: CoinOrderPaymentMethodDto | null;
  /** @deprecated Driver key; prefer payment_method. */
  gateway?: string | null;
}

export interface CoinOrderShowResponse {
  success: boolean;
  order: CoinOrderDto;
  balance?: number;
}

export interface CoinOrdersResponse {
  success: boolean;
  payment_available?: boolean;
  orders: CoinOrderDto[];
}

export interface CustomerGiftDto {
  id: number;
  sent_at: string | null;
  recipient_type?: "staff" | "customer" | string;
  recipient_name: string;
  recipient_avatar?: string | null;
  staff_id?: number | null;
  staff_number?: string | null;
  receiver_customer_id?: number | null;
  gift_name: string;
  /** Combo taps merged into this entry. */
  quantity: number;
  unit_price?: number;
  total_amount?: number;
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
