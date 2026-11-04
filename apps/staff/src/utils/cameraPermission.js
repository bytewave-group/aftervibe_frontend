/**
 * Request / verify camera access before html5-qrcode (getUserMedia).
 * Browsers prompt on their own; native apps need manifest + runtime grant.
 */
export async function ensureCameraPermission() {
    if (!navigator.mediaDevices?.getUserMedia) {
        return false;
    }

    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: 'environment' } },
            audio: false,
        });
        stream.getTracks().forEach((track) => track.stop());
        return true;
    } catch (e) {
        console.warn('Camera permission denied or unavailable', e);
        return false;
    }
}

export function isCameraPermissionError(error) {
    if (!error) return false;
    if (error.code === 'PERMISSION_DENIED' || error.message === 'PERMISSION_DENIED') {
        return true;
    }
    const name = String(error.name ?? '');
    const msg = String(error.message ?? '').toLowerCase();
    return (
        name === 'NotAllowedError' ||
        name === 'PermissionDeniedError' ||
        msg.includes('permission') ||
        msg.includes('not allowed')
    );
}

export function cameraScannerErrorMessage(error, t) {
    if (isCameraPermissionError(error)) {
        return t('Camera permission is required to scan QR codes');
    }
    return t('Camera unavailable. You can use a USB scanner.');
}
