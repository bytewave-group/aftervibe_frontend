import { Preferences } from '@capacitor/preferences';
import { loadGlobalData } from '../components/action/preferences';

const FALLBACK_TENANT_NAME = 'Pulsex';

let cachedTenantName = null;
let receiptShopName = null;

export function getTenantName(global) {
    return global?.tenant_name || cachedTenantName || FALLBACK_TENANT_NAME;
}

export function setCachedTenantName(name) {
    if (name) {
        cachedTenantName = name;
    }
}

export async function loadTenantNameFromStorage() {
    try {
        const value = await loadGlobalData();
        if (!value) {
            return cachedTenantName || FALLBACK_TENANT_NAME;
        }
        const global = JSON.parse(value);
        const name = getTenantName(global);
        setCachedTenantName(name);
        return name;
    } catch {
        return cachedTenantName || FALLBACK_TENANT_NAME;
    }
}

export async function persistGlobalData(data) {
    if (!data) return;
    setCachedTenantName(getTenantName(data));
    await Preferences.set({
        key: 'global_data',
        value: JSON.stringify(data),
    });
}

/** Set while building a receipt inside printPosReceipt. */
export function setReceiptShopName(name) {
    receiptShopName = name || null;
}

export function resolveReceiptShopName(shopName) {
    return shopName ?? receiptShopName ?? cachedTenantName ?? FALLBACK_TENANT_NAME;
}

export async function getTestPrintText() {
    const name = await loadTenantNameFromStorage();
    return `${name} Test Print\n\n`;
}
