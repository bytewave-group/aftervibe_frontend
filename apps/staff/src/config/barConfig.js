/** Central endpoint listing every bar (tenant) the staff app can log into. */
export const BARS_URL =
  import.meta.env.VITE_BARS_URL || "https://aftervibe_backend.test/api/bars";

const fixedBar = () => {
  const url = (import.meta.env.VITE_FIXED_BAR_URL || "")
    .trim()
    .replace(/\/+$/, "")
    .replace(/\/api$/i, "");

  if (!url) {
    return null;
  }

  try {
    const { host } = new URL(url);
    return { id: null, name: import.meta.env.VITE_FIXED_BAR_NAME || host, url };
  } catch {
    console.error("Invalid VITE_FIXED_BAR_URL:", url);
    return null;
  }
};

/**
 * Bar baked in at build time (one build per bar): the app always talks to it and hides bar selection.
 * null when VITE_FIXED_BAR_URL is not set, so the login page lets the employee pick a bar from BARS_URL.
 */
export const FIXED_BAR = fixedBar();
