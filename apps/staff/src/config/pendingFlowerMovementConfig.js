/**
 * Frontend-only switch for pending flower movement confirmation.
 * Not driven by globalData / API.
 *
 * - false: only staff fetches pending flower movement (after order confirmation)
 * - true: mummy also fetches pending flower movement on profile refresh
 */
export const MUMMY_PENDING_FLOWER_MOVEMENT_ENABLED = false;

export function shouldFetchPendingFlowerMovement(role) {
  const normalizedRole = role?.toLowerCase();
  if (normalizedRole === "staff") {
    return true;
  }
  if (normalizedRole === "mummy") {
    return MUMMY_PENDING_FLOWER_MOVEMENT_ENABLED;
  }
  return false;
}

export function shouldShowHomeRefreshButton(role) {
  const normalizedRole = role?.toLowerCase();
  if (normalizedRole === "staff") {
    return true;
  }
  if (normalizedRole === "mummy") {
    return MUMMY_PENDING_FLOWER_MOVEMENT_ENABLED;
  }
  return false;
}
