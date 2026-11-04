import { Capacitor } from '@capacitor/core';
import Printer from '../plugins/Printer';

export async function ensureBluetoothPermission() {
    if (Capacitor.getPlatform() !== 'android') return true;

    try {
        const result = await Printer.requestBluetoothPermission();
        return result?.granted !== false;
    } catch (e) {
        console.warn('Bluetooth permission denied', e);
        return false;
    }
}
