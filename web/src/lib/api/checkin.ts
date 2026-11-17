import { ApiError, apiGet, apiPost } from "@/lib/api/browser";
import type { CheckinClaimResponse, CheckinStatusResponse } from "@/lib/api/types";
import { mapCheckinStatus, type CheckinStatus } from "@/lib/checkin";

const STATUS_PATH = "/api/customer/checkin/status";
const CLAIM_PATH = "/api/customer/checkin";

export async function fetchCheckinStatus(): Promise<CheckinStatus> {
  const payload = await apiGet<CheckinStatusResponse>(STATUS_PATH, "required");
  return mapCheckinStatus(payload);
}

export async function postCheckin(): Promise<CheckinClaimResponse> {
  return apiPost<CheckinClaimResponse>(CLAIM_PATH, {}, "required");
}

export { ApiError };
