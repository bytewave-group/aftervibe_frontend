import { useState, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import {
    invalidatePrinterWarmUpCache,
    isPrinterStatusReady,
    loadSavedPrinterConfig,
    warmUpPrinterConnection,
} from '../utils/printerConnection';
import { isWebPrintSupported } from '../utils/webReceiptPrinter';

const PRINTER_HOME_ROLES = new Set(['manager', 'mummy', 'doctor']);

function normalizeRole(userRole) {
    const role = userRole?.toLowerCase();
    return role === 'doctor' ? 'mummy' : role;
}

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

function isPrinterPlatformSupported() {
    const isAndroidNative =
        Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
    const isWeb = !Capacitor.isNativePlatform();
    return isAndroidNative || (isWeb && isWebPrintSupported());
}

/**
 * Home / global printer link status for roles that use receipt printing.
 */
export function usePrinterConnectionStatus(userRole) {
    const [status, setStatus] = useState({
        loading: true,
        connected: false,
        paired: false,
        needsReconnect: false,
        configured: false,
    });

    const roleKey = normalizeRole(userRole);
    const enabled = PRINTER_HOME_ROLES.has(roleKey) && isPrinterPlatformSupported();

    const refresh = useCallback(async () => {
        if (!enabled) {
            setStatus({
                loading: false,
                connected: true,
                paired: false,
                needsReconnect: false,
                configured: false,
            });
            return;
        }

        setStatus((prev) => ({ ...prev, loading: true }));

        try {
            const cfg = await loadSavedPrinterConfig();
            const isWeb = !Capacitor.isNativePlatform();
            const configured = isPrinterConfigured(cfg, isWeb);

            if (!configured) {
                setStatus({
                    loading: false,
                    connected: false,
                    paired: false,
                    needsReconnect: false,
                    configured: false,
                });
                return;
            }

            const result = await warmUpPrinterConnection(cfg);
            setStatus({
                loading: false,
                connected: !!result.connected,
                paired: !!result.paired,
                needsReconnect: !!result.needsReconnect,
                configured: true,
            });
        } catch {
            setStatus({
                loading: false,
                connected: false,
                paired: false,
                needsReconnect: false,
                configured: false,
            });
        }
    }, [enabled]);

    useEffect(() => {
        refresh();
    }, [refresh]);

    useEffect(() => {
        if (!enabled) return undefined;

        const onVisible = () => {
            if (!document.hidden) {
                void refresh();
            }
        };

        window.addEventListener('pageshow', refresh);
        document.addEventListener('visibilitychange', onVisible);
        window.addEventListener('printerConnectionChanged', refresh);

        return () => {
            window.removeEventListener('pageshow', refresh);
            document.removeEventListener('visibilitychange', onVisible);
            window.removeEventListener('printerConnectionChanged', refresh);
        };
    }, [enabled, refresh]);

    const showBanner = enabled && !isPrinterStatusReady(status);

    return { showBanner, status, refresh, isReady: isPrinterStatusReady(status) };
}

export function notifyPrinterConnectionChanged() {
    invalidatePrinterWarmUpCache();
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('printerConnectionChanged'));
    }
}
