import { formatCountdown } from "./ktvSession";

export const FLOOR_STATE = Object.freeze({
  FREE: "free",
  OCCUPIED: "occupied",
  ENDING: "ending",
  GRACE: "grace",
});

const PRIORITY = { free: 0, occupied: 1, ending: 2, grace: 3 };

/**
 * Timers of a floor session `deltaSeconds` after it was fetched (server values + local tick, no clock skew).
 */
export function liveTiming(session, deltaSeconds, { endingSoonSeconds = 300, graceMinutes = 15 } = {}) {
  const delta = Math.max(0, Math.floor(deltaSeconds || 0));
  const elapsed = (Number(session.elapsed_seconds) || 0) + delta;
  const remainingAtFetch = Number(session.remaining_seconds) || 0;
  let remaining = 0;
  let overtime = 0;

  if (remainingAtFetch > 0) {
    remaining = remainingAtFetch - delta;
    if (remaining <= 0) {
      overtime = -remaining;
      remaining = 0;
    }
  } else {
    overtime = (Number(session.overtime_seconds) || 0) + delta;
  }

  let state = FLOOR_STATE.OCCUPIED;
  if (remaining <= 0) {
    state = overtime > graceMinutes * 60 ? FLOOR_STATE.FREE : FLOOR_STATE.GRACE;
  } else if (remaining <= endingSoonSeconds) {
    state = FLOOR_STATE.ENDING;
  }

  return { elapsed, remaining, overtime, state };
}

export function strongestState(states) {
  return states.reduce((carry, state) => (PRIORITY[state] > PRIORITY[carry] ? state : carry), FLOOR_STATE.FREE);
}

export function formatElapsed(seconds) {
  return formatCountdown(seconds);
}

export function initials(name) {
  const text = String(name || "").trim();
  if (!text) {
    return "?";
  }
  const parts = text.split(/\s+/);
  return (parts.length > 1 ? parts[0][0] + parts[1][0] : text.slice(0, 2)).toUpperCase();
}
