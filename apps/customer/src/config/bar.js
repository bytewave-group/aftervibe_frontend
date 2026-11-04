// Current bar (tenant) storage.
// Every bar has its own domain; customer tokens are only valid on the bar that issued them.

const CURRENT_BAR_KEY = "current_bar";
const CUSTOMER_TOKEN_KEY = "customer_token";
const CUSTOMER_KEY = "customer";
const CUSTOMER_TOKEN_BAR_URL_KEY = "customer_token_bar_url";
const PENDING_JOIN_TOKEN_KEY = "pending_join_token";

export function normalizeBarUrl(value) {
    const rawUrl = String(value || "").trim();

    if (!rawUrl) {
        return null;
    }

    const hasScheme = /^[a-z][a-z\d+.-]*:\/\//i.test(rawUrl);

    try {
        const url = new URL(hasScheme ? rawUrl : `https://${rawUrl}`);

        if (!["http:", "https:"].includes(url.protocol) || !url.hostname) {
            return null;
        }

        const path = url.pathname.replace(/\/+$/, "").replace(/\/api$/i, "");

        return `${url.origin}${path}`;
    } catch {
        return null;
    }
}

export function getCurrentBar() {
    try {
        const bar = JSON.parse(localStorage.getItem(CURRENT_BAR_KEY));

        return bar?.url ? bar : null;
    } catch {
        return null;
    }
}

export function getCurrentBarUrl() {
    return getCurrentBar()?.url || null;
}

export function getBarLabel(bar) {
    if (!bar) {
        return "";
    }

    if (bar.name) {
        return bar.name;
    }

    try {
        return new URL(bar.url).host;
    } catch {
        return bar.url;
    }
}

export function setCurrentBar({ id = null, name = null, url }) {
    const barUrl = normalizeBarUrl(url);

    if (!barUrl) {
        return null;
    }

    const previousBar = getCurrentBar();

    const bar = {
        id: id ?? (previousBar?.url === barUrl ? previousBar.id : null) ?? null,
        name: name || (previousBar?.url === barUrl ? previousBar.name : null) || null,
        url: barUrl,
    };

    if (getCustomerTokenBarUrl() !== barUrl) {
        clearCustomerSession();
    }

    if (previousBar?.url !== barUrl) {
        clearPendingJoinToken();
    }

    localStorage.setItem(CURRENT_BAR_KEY, JSON.stringify(bar));

    if (bar.id) {
        localStorage.setItem("bar_id", bar.id);
    } else {
        localStorage.removeItem("bar_id");
    }

    if (bar.name) {
        localStorage.setItem("bar_name", bar.name);
    } else {
        localStorage.removeItem("bar_name");
    }

    return bar;
}

export function clearCurrentBar() {
    clearCustomerSession();
    clearPendingJoinToken();
    localStorage.removeItem(CURRENT_BAR_KEY);
    localStorage.removeItem("bar_id");
    localStorage.removeItem("bar_name");
}

function getCustomerTokenBarUrl() {
    return localStorage.getItem(CUSTOMER_TOKEN_BAR_URL_KEY);
}

export function setCustomerSession(token, customer) {
    localStorage.setItem(CUSTOMER_KEY, JSON.stringify(customer));
    localStorage.setItem(CUSTOMER_TOKEN_KEY, token);
    localStorage.setItem(CUSTOMER_TOKEN_BAR_URL_KEY, getCurrentBarUrl() || "");
}

export function clearCustomerSession() {
    localStorage.removeItem(CUSTOMER_TOKEN_KEY);
    localStorage.removeItem(CUSTOMER_KEY);
    localStorage.removeItem(CUSTOMER_TOKEN_BAR_URL_KEY);
}

// A token is only usable when it was issued by the currently stored bar.
export function hasCustomerSession() {
    const token = localStorage.getItem(CUSTOMER_TOKEN_KEY);
    const barUrl = getCurrentBarUrl();

    if (!token) {
        return false;
    }

    if (!barUrl || getCustomerTokenBarUrl() !== barUrl) {
        clearCustomerSession();
        return false;
    }

    return true;
}

export function getPendingJoinToken() {
    return localStorage.getItem(PENDING_JOIN_TOKEN_KEY);
}

export function setPendingJoinToken(token) {
    localStorage.setItem(PENDING_JOIN_TOKEN_KEY, token);
}

export function clearPendingJoinToken() {
    localStorage.removeItem(PENDING_JOIN_TOKEN_KEY);
}

// Bar access QR codes encode `<join url>?token=<token>&api=<bar url>`; older ones only hold the raw token.
export function parseBarQrCode(decodedText) {
    const text = String(decodedText || "").trim();

    try {
        const url = new URL(text);
        const params = new URLSearchParams(url.hash.split("?")[1] || url.search);

        return {
            token: params.get("token"),
            barUrl: normalizeBarUrl(params.get("api")),
        };
    } catch {
        return { token: text, barUrl: null };
    }
}
