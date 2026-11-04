import { getCurrentBarUrl } from "./bar";

const searchParams = new URLSearchParams(window.location.search);

const hashParams = new URLSearchParams(
    window.location.hash.split("?")[1] || ""
);

console.log("CURRENT URL =", window.location.href);

const env =
    searchParams.get("env") ||
    hashParams.get("env") ||
    (
        window.location.hostname === "client.after-vibe.com" ||
        import.meta.env.VITE_API_URL?.includes("api.after-vibe.com")
            ? "live"
            : "local"
    );

// Shared central API: bar list and the Electron display endpoints (selected by bar_id).
export const CENTRAL_API_URL =
    env === "live"
        ? "https://api.after-vibe.com"
        : "https://aftervibe_backend.test/api";

export const BARS_URL =
    import.meta.env.VITE_BARS_URL || `${CENTRAL_API_URL}/bars`;

export const DISPLAY_API_URL = `${CENTRAL_API_URL}/animations/display`;

export const WS_URL =
    env === "live"
        ? "wss://client.after-vibe.com/ws"
        : "ws://127.0.0.1:8080";

// Customer API of the current bar, resolved at request time.
export function getApiUrl() {
    const barUrl = getCurrentBarUrl();

    return barUrl ? `${barUrl}/api` : CENTRAL_API_URL;
}

// Browser fallback for display pages: the Electron/bar_id flow uses the central API, otherwise the stored bar.
export function getDisplayApiUrl(barId) {
    const barUrl = getCurrentBarUrl();

    if (barId || !barUrl) {
        return `${DISPLAY_API_URL}?bar_id=${barId || ""}`;
    }

    return `${barUrl}/api/animations/display`;
}

console.log(
    `[REACT ENV] ${env.toUpperCase()} | CENTRAL API: ${CENTRAL_API_URL} | BAR API: ${getApiUrl()} | BARS: ${BARS_URL} | WS: ${WS_URL}`
);
