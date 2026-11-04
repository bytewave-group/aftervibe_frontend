import { Html5Qrcode } from "html5-qrcode";
import { useTranslation } from "react-i18next";
import { useEffect, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import { show_toast } from "../toast";

export default function useScanCodeBrowser({
  qrScannerConfig = {
    fps: 10,
  },
} = {}) {
  const { t } = useTranslation();
  // qr scan compomnent id ref
  const qrScannerIdRef = useRef(uuidv4());
  const qrScannerId = qrScannerIdRef.current;

  const qrScannerRef = useRef(null);

  const scanStart = async () => {
    if (qrScannerId) {
      return await startScanner();
    } else {
      show_toast("scan not ready");
    }
  };

  const scanStop = async () => {
    if (qrScannerRef.current && qrScannerRef.current.isScanning) {
      try {
        qrScannerRef.current.stop();
      } catch (error) {
        console.error("Error stopping scanner:");
      }
    }
    qrScannerRef.current = null;
  };

  const getCamera = async () => {
    try {
      const cameras = await Html5Qrcode.getCameras();
      return cameras;
    } catch (error) {
      return [];
    }
  };

  function selectBestCamera(cameras) {
    const backCam = cameras.find(
      (cam) =>
        /Back|environment/i.test(cam.label) &&
        !/Ultra\s?Wide|Telephoto|Macro/i.test(cam.label),
    );
    return (
      backCam?.id ||
      cameras?.[cameras?.length - 1]?.id ||
      cameras?.[0]?.id ||
      null
    );
  }

  const startScanner = async () => {
    try {
      const cameraNum = await getCamera();

      const scanner = new Html5Qrcode(qrScannerId);

      let cameraId;
      if (cameraNum?.length === 0) {
        return {
          status: false,
          result: "",
          error: t(
            "No camera detected. Please ensure your device has a camera and that the browser has permission to access it.",
          ),
        };
      } else {
        cameraId = selectBestCamera(cameraNum);
      }

      const cameraConfig = {
        deviceId: {
          exact: cameraId,
        },
      };

      qrScannerRef.current = scanner;

      const resScan = await new Promise((resolve) => {
        scanner.start(
          cameraConfig,
          qrScannerConfig,
          async (decodedText, decodedResult) => {
            const result = await scanSuccess(scanner, decodedText);
            resolve({ status: true, result: decodedText });
          },

          async (errorMessage) => {},
        );
      });

      return resScan;
    } catch (error) {
      console.error(error);
      return {
        status: false,
        result: "",
        error: t("Error starting camera. Please check permissions."),
      };
    }
  };

  const scanSuccess = async (scanner, decodedText) => {
    await scanStop();
    return decodedText;
  };

  const scanFailed = async (scanner, errorMessage) => {
    await scanStop();
    return errorMessage;
  };

  useEffect(() => {
    return () => {
      if (qrScannerRef.current && qrScannerRef.current.isScanning) {
        qrScannerRef.current.stop().catch((err) => {
          console.error("Error stopping scanner on cleanup");
        });
      }
    };
  }, []);

  return {
    scanStart,
    scanStop,

    qrScannerId,
  };
}
