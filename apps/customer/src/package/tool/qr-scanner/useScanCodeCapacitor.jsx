import {
  CapacitorBarcodeScanner,
  CapacitorBarcodeScannerCameraDirection,
  CapacitorBarcodeScannerScanOrientation,
  CapacitorBarcodeScannerTypeHintALLOption,
} from "@capacitor/barcode-scanner";
import { useTranslation } from "react-i18next";
import { Capacitor } from "@capacitor/core";
import { Camera, CameraResultType } from "@capacitor/camera";
import { show_toast } from "../toast";

const capacitorOption = {
  hint: CapacitorBarcodeScannerTypeHintALLOption.ALL,
  scanOrientation: CapacitorBarcodeScannerScanOrientation.ADAPTIVE,
  cameraDirection: CapacitorBarcodeScannerCameraDirection.BACK,
  scanInstructions: "Scan QR code",
  android: {
    scanningLibrary: "zxing",
  },
};

export default function useScanCodeCapacitor() {
  const { t } = useTranslation();
  const checkPermission = async () => {
    const resStatus = await Camera.checkPermissions();
    if (resStatus.camera === "granted") return true;

    const request = await Camera.requestPermissions("camera");

    if (request.granted) {
      return true;
    }

    return false;
  };
  const scanStart = async () => {
    try {
      const isIOS = Capacitor.getPlatform() === "ios";
      if (isIOS) {
        const hasPermission = await checkPermission();
        if (!hasPermission) {
          show_toast("Camera permission denied");
          return {
            status: false,
            result: "",
            error: "Camera permission denied",
          };
        }
      }
      const res = await CapacitorBarcodeScanner.scanBarcode(capacitorOption);
      const result = res?.ScanResult;

      if (result) {
        return { status: true, result };
      } else {
        return { status: false, result: "", error: t("Invalid QR code") };
      }
    } catch (error) {
      return { status: false, result: "", error: t("Camera failed to open") };
    }
  };

  const scanStop = async () => {
    return;
  };

  return {
    scanStart,
    scanStop,

    qrScannerId: undefined,
  };
}
