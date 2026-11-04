import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import Printer from '../plugins/Printer';
import { PRINTER_PREFERENCES_KEY } from '../constants/printerConfig';
import { ensureBluetoothPermission } from './bluetoothPermission';
import { getWebConnectionStatus, isWebPrintSupported } from './webReceiptPrinter';

function isPrinterConfigured(cfg, isWeb) {
    if (!cfg) return false;
    const mode = cfg.mode === 'bluetooth' ? 'bluetooth' : cfg.mode === 'ethernet' ? 'ethernet' : 'builtin';
    if (isWeb) {
        return mode === 'bluetooth' && !!cfg.bluetoothDevice?.address;
    }
    if (mode === 'builtin') return true;
    if (mode === 'ethernet') return !!cfg.printerIp?.trim();
    return mode === 'bluetooth' && !!cfg.bluetoothDevice?.address;
}

/** UI + banner: printer can print now (live link on Android, BLE ready on web). */
export function isPrinterStatusReady(status) {
    if (!status || status.loading) return false;
    return !!status.connected;
}

/** True when a saved printer is configured and the live link is ready to print. */
export async function isPrinterReadyForPrint() {
    const isAndroidNative =
        Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
    const isWeb = !Capacitor.isNativePlatform();
    if (!isAndroidNative && !(isWeb && isWebPrintSupported())) {
        return false;
    }

    const cfg = await loadSavedPrinterConfig();
    if (!isPrinterConfigured(cfg, isWeb)) {
        return false;
    }

    const result = await warmUpPrinterConnection(cfg);
    return !!result.connected;
}

export async function loadSavedPrinterConfig() {
    const { value } = await Preferences.get({ key: PRINTER_PREFERENCES_KEY });
    if (!value) return null;
    try {
        return JSON.parse(value);
    } catch {
        return null;
    }
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function isPageReload() {
    try {
        const [nav] = performance.getEntriesByType('navigation');
        if (nav?.type === 'reload') return true;
    } catch {
        // ignore
    }
    return typeof performance !== 'undefined' && performance.navigation?.type === 1;
}

/**
 * Reconnect to the saved printer after login, refresh, or opening Printer Settings.
 * Does not clear printer_config on logout — only restores the live link when possible.
 */
export async function restorePrinterConnection(cfg) {
    const config = cfg ?? (await loadSavedPrinterConfig());
    if (!config) {
        return { connected: false, paired: false, needsReconnect: false };
    }

    const isAndroidNative =
        Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
    const isWeb = !Capacitor.isNativePlatform();
    const bt = config.bluetoothDevice || {};
    const hasBtPrinter = config.mode === 'bluetooth' && !!bt.address;
    const hasEthernet = config.mode === 'ethernet' && !!config.printerIp?.trim();
    const hasBuiltin = config.mode === 'builtin' || (!isWeb && !hasBtPrinter && !hasEthernet);

    if (isAndroidNative && (hasBuiltin || hasBtPrinter || hasEthernet)) {
        try {
            await ensureBluetoothPermission();
            await Printer.setPrinterConfig({
                mode: config.mode,
                bluetoothAddress: bt.address ?? '',
                bluetoothName: bt.name ?? '',
                usbDevicePath: config.usbDevicePath ?? '',
                printerIp: config.printerIp ?? '',
                printerPort: config.printerPort ?? '9100',
            });
            const result = await Printer.connect();
            return {
                connected: !!result.connected,
                paired: hasBtPrinter || hasBuiltin || hasEthernet,
                needsReconnect: !result.connected && (hasBtPrinter || hasEthernet),
                mode: config.mode,
            };
        } catch {
            return {
                connected: false,
                paired: hasBtPrinter || hasBuiltin || hasEthernet,
                needsReconnect: hasBtPrinter || hasEthernet,
                mode: config.mode,
            };
        }
    }

    if (isWeb && hasBtPrinter) {
        try {
            const status = await getWebConnectionStatus(config);
            return {
                // Match Printer.getConnectionStatus (web): ready = can print after Connect
                connected: !!status.ready,
                paired: !!status.paired,
                needsReconnect: !!status.needsReconnect,
                mode: 'bluetooth',
            };
        } catch {
            const status = await getWebConnectionStatus(config);
            return {
                connected: !!status.ready,
                paired: !!status.paired,
                needsReconnect: !!status.needsReconnect,
                mode: 'bluetooth',
            };
        }
    }

    return {
        connected: false,
        paired: hasBtPrinter,
        needsReconnect: isWeb && hasBtPrinter,
        mode: config.mode === 'bluetooth' ? 'bluetooth' : config.mode === 'ethernet' ? 'ethernet' : 'builtin',
    };
}

let warmUpInFlight = null;
let lastWarmUpAt = 0;
const WARMUP_DEBOUNCE_MS = 400;
const WARMUP_ATTEMPTS = 3;

/** Force the next status check to reconnect instead of reusing a stale in-flight warm-up. */
export function invalidatePrinterWarmUpCache() {
    warmUpInFlight = null;
}

/**
 * Debounced reconnect used after login, home mount, and app resume.
 * Retries so the printer is ready without opening Printer Settings.
 */
export function warmUpPrinterConnection(cfg) {
    const now = Date.now();
    if (warmUpInFlight && now - lastWarmUpAt < WARMUP_DEBOUNCE_MS) {
        return warmUpInFlight;
    }
    lastWarmUpAt = now;

    warmUpInFlight = (async () => {

        // Brief delay after full page reload so the Bluetooth stack is ready
        if (isPageReload()) {
            await sleep(300);
        }

        let last = { connected: false, paired: false, needsReconnect: false };
        for (let attempt = 0; attempt < WARMUP_ATTEMPTS; attempt += 1) {
            last = await restorePrinterConnection(cfg);
            if (last.connected) {
                return last;
            }
            if (attempt < WARMUP_ATTEMPTS - 1) {
                await sleep(500);
            }
        }
        return last;
    })();

    warmUpInFlight.finally(() => {
        warmUpInFlight = null;
    });

    return warmUpInFlight;
}

let autoReconnectInitialized = false;

/** Run after refresh / tab restore — reconnect without opening Printer Settings. */
export function initPrinterAutoReconnect() {
    if (autoReconnectInitialized || typeof window === 'undefined') {
        return;
    }
    autoReconnectInitialized = true;

    window.addEventListener('pageshow', () => {
        void warmUpPrinterConnection();
    });

    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            void warmUpPrinterConnection();
        }
    });
}
