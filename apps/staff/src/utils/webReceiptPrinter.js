import { Preferences } from '@capacitor/preferences';
import { BleClient, numbersToDataView } from '@capacitor-community/bluetooth-le';
import { PRINTER_PREFERENCES_KEY } from '../constants/printerConfig';
import { getTestPrintText } from './tenantName';

/** Common BLE thermal printer GATT profiles (ESC/POS over BLE). */
const KNOWN_PRINTER_PROFILES = [
    {
        service: '000018f0-0000-1000-8000-00805f9b34fb',
        characteristic: '00002af1-0000-1000-8000-00805f9b34fb',
    },
    {
        service: '6e400001-b5a3-f393-e0a9-e50e24dcca9e',
        characteristic: '6e400002-b5a3-f393-e0a9-e50e24dcca9e',
    },
    {
        service: '49535343-fe7d-4ae5-8fa9-9fafd205e455',
        characteristic: '49535343-8841-43f4-a8d4-ecbe34729bb3',
    },
    {
        service: '0000ae30-0000-1000-8000-00805f9b34fb',
        characteristic: '0000ae01-0000-1000-8000-00805f9b34fb',
    },
];

const BLE_REQUEST_SERVICES = [
    ...new Set(KNOWN_PRINTER_PROFILES.flatMap((p) => [p.service, p.characteristic])),
];

const CHUNK_SIZE = 120;
const WRITE_DELAY_MS = 15;
const WEB_BLE_SESSION_KEY = 'web_printer_ble_device';

let bleInitialized = false;
let connectedDeviceId = null;
let activeWritePath = null;

function rememberWebBleSession(deviceId) {
    if (!deviceId) return;
    try {
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem(WEB_BLE_SESSION_KEY, deviceId);
        }
        if (typeof sessionStorage !== 'undefined') {
            sessionStorage.setItem(WEB_BLE_SESSION_KEY, deviceId);
        }
    } catch {
        // ignore
    }
}

function clearWebBleSession() {
    try {
        if (typeof localStorage !== 'undefined') {
            localStorage.removeItem(WEB_BLE_SESSION_KEY);
        }
        if (typeof sessionStorage !== 'undefined') {
            sessionStorage.removeItem(WEB_BLE_SESSION_KEY);
        }
    } catch {
        // ignore
    }
}

function getRememberedWebBleDeviceId() {
    try {
        if (typeof localStorage !== 'undefined') {
            const id = localStorage.getItem(WEB_BLE_SESSION_KEY);
            if (id) return id;
        }
        if (typeof sessionStorage !== 'undefined') {
            return sessionStorage.getItem(WEB_BLE_SESSION_KEY);
        }
    } catch {
        // ignore
    }
    return null;
}

export function isWebPrintSupported() {
    return typeof navigator !== 'undefined' && !!navigator.bluetooth;
}

/** Chrome 85+ / Edge — restores permitted devices after refresh. Not in Safari or older browsers. */
export function hasBluetoothGetDevices() {
    return (
        typeof navigator !== 'undefined' &&
        navigator.bluetooth &&
        typeof navigator.bluetooth.getDevices === 'function'
    );
}

function isDeviceActiveInSession(deviceId) {
    return connectedDeviceId === deviceId && !!activeWritePath;
}

function normalizeUuid(uuid) {
    return String(uuid ?? '').toLowerCase();
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function ensureBleReady() {
    if (!isWebPrintSupported()) {
        throw new Error('Web Bluetooth is not supported in this browser. Use Chrome or Edge over HTTPS.');
    }
    if (!bleInitialized) {
        await BleClient.initialize();
        bleInitialized = true;
    }
}

export async function loadPrinterConfig() {
    const { value } = await Preferences.get({ key: PRINTER_PREFERENCES_KEY });
    return value ? JSON.parse(value) : { mode: 'bluetooth', bluetoothDevice: null };
}

async function savePrinterConfig(cfg) {
    await Preferences.set({ key: PRINTER_PREFERENCES_KEY, value: JSON.stringify(cfg) });
}

function findWritableCharacteristic(services, preferred) {
    if (preferred?.serviceUuid && preferred?.characteristicUuid) {
        const service = services.find((s) => normalizeUuid(s.uuid) === normalizeUuid(preferred.serviceUuid));
        const ch = service?.characteristics?.find(
            (c) => normalizeUuid(c.uuid) === normalizeUuid(preferred.characteristicUuid)
        );
        if (ch && (ch.properties.write || ch.properties.writeWithoutResponse)) {
            return {
                serviceUuid: service.uuid,
                characteristicUuid: ch.uuid,
                writeWithoutResponse: !!ch.properties.writeWithoutResponse && !ch.properties.write,
            };
        }
    }

    for (const profile of KNOWN_PRINTER_PROFILES) {
        const service = services.find((s) => normalizeUuid(s.uuid) === normalizeUuid(profile.service));
        const ch = service?.characteristics?.find(
            (c) => normalizeUuid(c.uuid) === normalizeUuid(profile.characteristic)
        );
        if (ch && (ch.properties.write || ch.properties.writeWithoutResponse)) {
            return {
                serviceUuid: service.uuid,
                characteristicUuid: ch.uuid,
                writeWithoutResponse: !!ch.properties.writeWithoutResponse && !ch.properties.write,
            };
        }
    }

    for (const service of services) {
        const uuid = normalizeUuid(service.uuid);
        if (uuid.startsWith('00001800-') || uuid.startsWith('00001801-')) continue;
        for (const ch of service.characteristics || []) {
            if (ch.properties.write || ch.properties.writeWithoutResponse) {
                return {
                    serviceUuid: service.uuid,
                    characteristicUuid: ch.uuid,
                    writeWithoutResponse: !!ch.properties.writeWithoutResponse && !ch.properties.write,
                };
            }
        }
    }

    return null;
}

/** Build ESC/POS bytes from plain-text receipt (matches Android line-by-line flow). */
export function encodeEscPosReceipt(text) {
    const init = [0x1b, 0x40];
    const lines = String(text ?? '').split('\n');
    const body = [];

    lines.forEach((line) => {
        const encoder = new TextEncoder();
        body.push(...encoder.encode(line));
        body.push(0x0a);
    });

    const feedCut = [0x1b, 0x64, 0x03, 0x1d, 0x56, 0x01];
    return new Uint8Array([...init, ...body, ...feedCut]);
}

async function writeChunk(deviceId, path, chunk) {
    const value = numbersToDataView([...chunk]);
    if (path.writeWithoutResponse) {
        await BleClient.writeWithoutResponse(deviceId, path.serviceUuid, path.characteristicUuid, value);
    } else {
        await BleClient.write(deviceId, path.serviceUuid, path.characteristicUuid, value);
    }
}

async function writeEscPos(deviceId, path, data) {
    for (let offset = 0; offset < data.length; offset += CHUNK_SIZE) {
        const chunk = data.subarray(offset, offset + CHUNK_SIZE);
        await writeChunk(deviceId, path, chunk);
        if (offset + CHUNK_SIZE < data.length) {
            await sleep(WRITE_DELAY_MS);
        }
    }
}

async function resolveWritePath(deviceId, cfg) {
    const services = await BleClient.getServices(deviceId);
    const path = findWritableCharacteristic(services, cfg?.webBle);
    if (!path) {
        throw new Error('No writable print characteristic found on this printer.');
    }
    return path;
}

/** Load every browser-permitted BLE device into the plugin map (Chrome / Edge). */
async function registerPermittedBleDevices(preferredDeviceId) {
    if (!hasBluetoothGetDevices()) {
        return isDeviceActiveInSession(preferredDeviceId);
    }

    await ensureBleReady();

    const rememberedId = getRememberedWebBleDeviceId();
    const targetId = preferredDeviceId || rememberedId;

    try {
        const permitted = await navigator.bluetooth.getDevices();
        const ids = permitted.map((d) => d.id);
        if (targetId && !ids.includes(targetId)) {
            ids.push(targetId);
        }
        if (ids.length) {
            await BleClient.getDevices(ids);
        }
        if (targetId) {
            return (await BleClient.getDevices([targetId])).length > 0;
        }
        return ids.length > 0;
    } catch {
        if (!targetId) return false;
        try {
            return (await BleClient.getDevices([targetId])).length > 0;
        } catch {
            return false;
        }
    }
}

/**
 * Device must be in the plugin map before connect().
 * Same tab: in-memory link. After login/refresh: getDevices() when supported.
 */
async function ensureWebBleDeviceRegistered(deviceId) {
    if (isDeviceActiveInSession(deviceId)) {
        return true;
    }

    if (hasBluetoothGetDevices()) {
        return registerPermittedBleDevices(deviceId);
    }

    if (typeof sessionStorage !== 'undefined') {
        try {
            return sessionStorage.getItem(WEB_BLE_SESSION_KEY) === deviceId && isDeviceActiveInSession(deviceId);
        } catch {
            return false;
        }
    }

    return false;
}

async function connectToSavedPrinter(cfg) {
    await ensureBleReady();

    const device = cfg?.bluetoothDevice;

    if (!device?.address) {
        throw new Error(
            'No Bluetooth printer selected.'
        );
    }

    const deviceId = device.address;

    if (connectedDeviceId === deviceId && activeWritePath) {
        return { deviceId, path: activeWritePath };
    }

    const permitted = await navigator.bluetooth.getDevices();

    const matched = permitted.find((d) => d.id === deviceId);

    if (!matched) {
        throw new Error(
            'Printer permission expired. Tap Connect Printer again.'
        );
    }

    await BleClient.getDevices([matched.id]);

    try {
        await BleClient.connect(deviceId, () => {
            connectedDeviceId = null;
            activeWritePath = null;
        });
    } catch (e) {
        const msg = String(e?.message || '').toLowerCase();

        if (
            !msg.includes('already') &&
            !msg.includes('connected')
        ) {
            throw e;
        }
    }

    const path = await resolveWritePath(deviceId, cfg);

    connectedDeviceId = deviceId;
    activeWritePath = path;

    rememberWebBleSession(deviceId);

    return { deviceId, path };
}

export async function pairWebPrinter() {
    await ensureBleReady();

    const device = await BleClient.requestDevice({
        optionalServices: BLE_REQUEST_SERVICES,
    });

    if (connectedDeviceId && connectedDeviceId !== device.deviceId) {
        try {
            await BleClient.disconnect(connectedDeviceId);
        } catch {
            // ignore
        }
    }

    await BleClient.connect(device.deviceId, () => {
        connectedDeviceId = null;
        activeWritePath = null;
    });

    const path = await resolveWritePath(device.deviceId, {});
    connectedDeviceId = device.deviceId;
    activeWritePath = path;
    rememberWebBleSession(device.deviceId);

    const cfg = await loadPrinterConfig();
    const next = {
        ...cfg,
        mode: 'bluetooth',
        bluetoothDevice: {
            address: device.deviceId,
            name: device.name || device.deviceId,
        },
        webBle: {
            serviceUuid: path.serviceUuid,
            characteristicUuid: path.characteristicUuid,
            writeWithoutResponse: path.writeWithoutResponse,
        },
    };
    await savePrinterConfig(next);

    return {
        device: next.bluetoothDevice,
        connected: true,
    };
}

/**
 * Web printer status (does not require an active GATT link).
 * - paired: saved in preferences from a previous Connect
 * - ready: browser still allows this device (getDevices) — can print after refresh
 * - needsReconnect: saved printer but browser permission lost — user must tap Connect again
 * - connected: live GATT session in this tab (optional; printing reconnects automatically)
 */
export async function getWebConnectionStatus(cfg) {
    if (!isWebPrintSupported()) {
        return {
            connected: false,
            paired: false,
            ready: false,
            needsReconnect: false,
            message: 'Web Bluetooth not supported',
        };
    }

    const activeCfg = cfg || (await loadPrinterConfig());
    const deviceId = activeCfg.bluetoothDevice?.address;

    if (!deviceId) {
        return {
            connected: false,
            paired: false,
            ready: false,
            needsReconnect: false,
            message: 'No printer paired',
        };
    }

    try {
        await ensureBleReady();

        // already connected in memory
        if (isDeviceActiveInSession(deviceId)) {
            return {
                connected: true,
                paired: true,
                ready: true,
                needsReconnect: false,
                liveConnected: true,
                mode: 'bluetooth',
                message: 'Printer ready',
            };
        }

        // IMPORTANT
        const permitted = await navigator.bluetooth.getDevices();

        const found = permitted.some((d) => d.id === deviceId);

        return {
            connected: false,
            paired: true,
            ready: found,
            needsReconnect: !found,
            liveConnected: false,
            mode: 'bluetooth',
            message: found
                ? 'Printer ready'
                : 'Tap Connect Printer again',
        };
    } catch (e) {
        return {
            connected: false,
            paired: true,
            ready: false,
            needsReconnect: true,
            message: e?.message || 'Not connected',
        };
    }
}

/** Call when opening Printer Settings to restore BLE permission after refresh. */
export async function restoreWebPrinterSession(cfg) {
    return getWebConnectionStatus(cfg);
}

export async function printReceiptWeb(text, cfg) {
    if (!text) return;

    const activeCfg = cfg || (await loadPrinterConfig());
    if (!activeCfg.bluetoothDevice?.address) {
        throw new Error('No Bluetooth printer connected. Open Printer Settings and connect your printer.');
    }

    const printCfg = { ...activeCfg, mode: 'bluetooth' };
    const { deviceId, path } = await connectToSavedPrinter(printCfg);
    const data = encodeEscPosReceipt(text);
    await writeEscPos(deviceId, path, data);
}

export async function printTestWeb(text) {
    const printText = text || (await getTestPrintText());
    await printReceiptWeb(printText);
}

export async function disconnectWebPrinter() {
    if (!connectedDeviceId) return;
    try {
        await BleClient.disconnect(connectedDeviceId);
    } catch {
        // ignore
    }
    connectedDeviceId = null;
    activeWritePath = null;
}
