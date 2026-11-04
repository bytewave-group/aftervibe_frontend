import { Html5Qrcode } from 'html5-qrcode';
import { ensureCameraPermission } from './cameraPermission';

export const QR_SCANNER_CONFIG = {
    fps: 10,
    qrbox: { width: 250, height: 250 },
    aspectRatio: 1.0,
};

/**
 * Request camera permission and start html5-qrcode on `elementId`.
 * @returns {Promise<Html5Qrcode>}
 */
export async function startQrCameraScanner(elementId, onScan, onScanFailure, config = QR_SCANNER_CONFIG) {
    const granted = await ensureCameraPermission();
    if (!granted) {
        const err = new Error('PERMISSION_DENIED');
        err.code = 'PERMISSION_DENIED';
        throw err;
    }

    const scanner = new Html5Qrcode(elementId);
    await scanner.start(
        { facingMode: 'environment' },
        config,
        onScan,
        onScanFailure ?? (() => {})
    );
    return scanner;
}
