import axios from "axios";
import { BARS_URL, UNLOCK_URL } from "../config/barConfig";

/**
 * Normalise a typed bar address into a base URL (no trailing slash, no /api).
 * e.g. "mybar.after-vibe.com/api/" -> "https://mybar.after-vibe.com"
 * Returns null when the value cannot be parsed as a URL.
 */
export const normaliseBarUrl = (value) => {
  let url = (value || "").trim();
  if (!url) {
    return null;
  }

  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }

  url = url.replace(/\/+$/, "").replace(/\/api$/i, "").replace(/\/+$/, "");

  try {
    const parsed = new URL(url);
    if (!parsed.hostname) {
      return null;
    }
    return `${parsed.origin}${parsed.pathname.replace(/\/+$/, "")}`;
  } catch {
    return null;
  }
};

/** Check the admin unlock PIN with the central API. Resolves to { success, message }. */
export const unlockBarChoice = async (pin) => {
  try {
    const res = await axios.post(
      UNLOCK_URL,
      { pin },
      { headers: { Accept: "application/json" } }
    );
    return { success: !!res.data?.success, message: res.data?.message || "" };
  } catch (error) {
    return { success: false, message: error.response?.data?.message || "" };
  }
};

/** Fetch the bar list from the central API as [{ id, name, url }]. */
export const fetchBars = async () => {
  const res = await axios.get(BARS_URL, {
    headers: { Accept: "application/json" },
  });
  const bars = Array.isArray(res.data?.bars) ? res.data.bars : [];

  return bars
    .map((bar) => ({
      id: bar.id ?? null,
      name: bar.name || bar.domain || "",
      url: normaliseBarUrl(bar.url || bar.domain),
    }))
    .filter((bar) => bar.url);
};
