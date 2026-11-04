import { registerPlugin } from '@capacitor/core';
import {
    disconnectWebPrinter,
    getWebConnectionStatus,
    isWebPrintSupported,
    loadPrinterConfig,
    pairWebPrinter,
    printReceiptWeb,
    printTestWeb,
} from '../utils/webReceiptPrinter';

const webPrinter = {
    async setPrinterConfig() {},

    async getPrinterConfig() {
        const cfg = await loadPrinterConfig();
        const bt = cfg.bluetoothDevice || {};
        return {
            mode: cfg.mode === 'bluetooth' ? 'bluetooth' : cfg.mode === 'ethernet' ? 'ethernet' : 'builtin',
            bluetoothAddress: bt.address ?? '',
            bluetoothName: bt.name ?? '',
            usbDevicePath: cfg.usbDevicePath ?? '',
            printerIp: cfg.printerIp ?? '',
            printerPort: cfg.printerPort ?? '9100',
        };
    },

    async getBondedDevices() {
        const cfg = await loadPrinterConfig();
        const bt = cfg.bluetoothDevice;
        if (!bt?.address) {
            return { devices: [], needsBluetoothPermission: false };
        }
        return {
            devices: [{ address: bt.address, name: bt.name || bt.address }],
            needsBluetoothPermission: false,
        };
    },

    async requestBluetoothPermission() {
        return { granted: isWebPrintSupported() };
    },

    async connect() {
        const cfg = await loadPrinterConfig();
        const status = await getWebConnectionStatus(cfg);
        return {
            connected: status.connected,
            paired: status.paired,
            ready: status.ready,
            needsReconnect: status.needsReconnect,
            message: status.message || '',
        };
    },

    async getConnectionStatus() {
        const cfg = await loadPrinterConfig();
        const status = await getWebConnectionStatus(cfg);
    
        return {
            mode: cfg.mode === 'bluetooth' ? 'bluetooth' : cfg.mode === 'ethernet' ? 'ethernet' : 'builtin',
            connected: status.ready,
            paired: status.paired,
            ready: status.ready,
            needsReconnect: status.needsReconnect,
        };
    },

    async printTest(options) {
        await printTestWeb(options?.text);
    },

    async printText({ text }) {
        if (!text) {
            throw new Error('text is required');
        }
        await printReceiptWeb(text);
    },

    async pairDevice() {
        return pairWebPrinter();
    },

    async disconnect() {
        await disconnectWebPrinter();
    },
};

const Printer = registerPlugin('Printer', {
    web: () => webPrinter,
});

export default Printer;
