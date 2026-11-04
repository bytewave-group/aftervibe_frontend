import { setRecoil } from "recoil-nexus";

export const getUserId = (u) => u?.code;

export function processChatMessage({ data, seenMessageIds, lastMessageTime }) {
  const now = Date.now();
  if (!data || data?.type !== "crs-new-message") {
    return { shouldIgnore: true, now, msgId: "" };
  }

  const msgId =
    data?.messageId ?? data?.id ?? data?.message?.id ?? data?.data?.id;

  if (msgId) {
    if (seenMessageIds.has(msgId)) {
      return { shouldIgnore: true, now, msgId: "" };
    }

    return {
      shouldIgnore: false,
      now,
      msgId,
    };
  }

  if (now - lastMessageTime < 400) {
    return { shouldIgnore: true, now, msgId: "" };
  }

  return {
    shouldIgnore: false,
    now,
    msgId: "",
  };
}

export const playNotificationSound = async (ctx) => {
  if (
    !ctx ||
    typeof ctx.createOscillator !== "function" ||
    typeof ctx.createGain !== "function" ||
    !ctx.destination
  ) {
    console.error("Error , can't play notification sound");
    return;
  }

  if (ctx.state === "suspended") {
    await ctx.resume();
  }

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.frequency.value = 800;
  osc.type = "sine";
  gain.gain.setValueAtTime(0.15, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.15);
};
