import { getApiUrl } from "./api";

// Customer API request with the stored bearer token. Resolves to { ok, status, data }.
export async function customerFetch(path, { method = "GET", body, headers = {} } = {}) {
    const token = localStorage.getItem("customer_token");
    const isFormData = body instanceof FormData;

    const response = await fetch(`${getApiUrl()}${path}`, {
        method,
        headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
            ...(body && !isFormData ? { "Content-Type": "application/json" } : {}),
            ...headers,
        },
        body: body ? (isFormData ? body : JSON.stringify(body)) : undefined,
    });

    let data = {};

    try {
        data = await response.json();
    } catch {
        data = {};
    }

    return {
        ok: response.ok && data.success !== false,
        status: response.status,
        data,
    };
}

// First validation error from a Laravel 422 response, else the message.
export function apiErrorMessage(data, fallback = "Something went wrong. Please try again.") {
    const firstError = data?.errors && Object.values(data.errors)[0];

    if (Array.isArray(firstError) && firstError.length) {
        return firstError[0];
    }

    return data?.message || fallback;
}
