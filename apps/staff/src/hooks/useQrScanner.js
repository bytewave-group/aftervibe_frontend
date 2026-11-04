import { useCallback, useEffect, useRef, useState } from "react";
import { f7 } from "framework7-react";
import { useTranslation } from "../services/useTranslation";
import { cameraScannerErrorMessage } from "../utils/cameraPermission";
import { startQrCameraScanner } from "../utils/qrCameraScanner";

/**
 * USB + camera QR/barcode scanner state and lifecycle.
 * Pair with the {@link QrScanner} component for the modal UI.
 */
export function useQrScanner({
  readerElementId,
  onDecoded,
  isProcessingScanRef,
  active: controlledActive,
  onActiveChange,
  enabled = true,
  onClose,
  showPreloaderOnCameraScan = true,
}) {
  const { t } = useTranslation();
  const [internalActive, setInternalActive] = useState(false);
  const [scanMode, setScanMode] = useState(null);
  const [cameraUnavailable, setCameraUnavailable] = useState(false);
  const qrScannerRef = useRef(null);
  const usbScanInputRef = useRef(null);

  const isControlled = controlledActive !== undefined;
  const showQrScanner = isControlled ? controlledActive : internalActive;

  const setShowQrScanner = useCallback(
    (value) => {
      if (onActiveChange) {
        onActiveChange(value);
      }
      if (!isControlled) {
        setInternalActive(value);
      }
    },
    [isControlled, onActiveChange]
  );

  const resetScannerState = useCallback(() => {
    setScanMode(null);
    setCameraUnavailable(false);
    qrScannerRef.current = null;
  }, []);

  const handleQrScannerClose = useCallback(() => {
    if (qrScannerRef.current?.isScanning) {
      qrScannerRef.current.stop().catch((err) => {
        console.error("Error stopping scanner:", err);
      });
    }
    setShowQrScanner(false);
    resetScannerState();
    onClose?.();
  }, [onClose, resetScannerState, setShowQrScanner]);

  const handleUsbScanKeyDown = useCallback(
    (e) => {
      if (e.key !== "Enter") return;
      const value = e.target.value?.trim();
      if (!value || isProcessingScanRef?.current) return;
      e.preventDefault();
      e.target.value = "";
      if (isProcessingScanRef) {
        isProcessingScanRef.current = true;
      }
      if (qrScannerRef.current?.isScanning) {
        qrScannerRef.current.stop().catch(() => {});
      }
      setShowQrScanner(false);
      resetScannerState();
      onDecoded(value);
    },
    [isProcessingScanRef, onDecoded, resetScannerState, setShowQrScanner]
  );

  useEffect(() => {
    if (!enabled || !showQrScanner || scanMode !== "camera") {
      return () => {
        if (qrScannerRef.current?.isScanning) {
          qrScannerRef.current.stop().catch((err) => {
            console.error("Error stopping scanner on cleanup:", err);
          });
        }
      };
    }

    const startScanner = async () => {
      try {
        const scanner = await startQrCameraScanner(
          readerElementId,
          async (decodedText) => {
            if (isProcessingScanRef?.current) return;
            if (isProcessingScanRef) {
              isProcessingScanRef.current = true;
            }
            if (showPreloaderOnCameraScan) {
              f7.preloader.show();
            }
            await scanner.stop();
            setShowQrScanner(false);
            resetScannerState();
            try {
              await onDecoded(decodedText);
            } finally {
              if (isProcessingScanRef) {
                isProcessingScanRef.current = false;
              }
            }
          },
          () => {}
        );

        qrScannerRef.current = scanner;
        setCameraUnavailable(false);
        setTimeout(() => usbScanInputRef.current?.focus(), 300);
      } catch (error) {
        console.error("Error starting QR scanner:", error);
        setCameraUnavailable(true);
        f7.toast.show({
          text: cameraScannerErrorMessage(error, t),
          position: "center",
          closeTimeout: 3000,
          cssClass: "error-toast",
        });
        setTimeout(() => usbScanInputRef.current?.focus(), 100);
      }
    };

    const timer = setTimeout(() => {
      startScanner();
    }, 100);

    return () => {
      clearTimeout(timer);
      if (qrScannerRef.current?.isScanning) {
        qrScannerRef.current.stop().catch((err) => {
          console.error("Error stopping scanner on cleanup:", err);
        });
      }
    };
  }, [
    enabled,
    showQrScanner,
    scanMode,
    readerElementId,
    t,
    onDecoded,
    isProcessingScanRef,
    showPreloaderOnCameraScan,
    resetScannerState,
    setShowQrScanner,
  ]);

  useEffect(() => {
    if (!enabled || !showQrScanner || scanMode !== "usb") return;
    const timer = setTimeout(() => usbScanInputRef.current?.focus(), 100);
    return () => clearTimeout(timer);
  }, [enabled, showQrScanner, scanMode]);

  const openQrScanner = useCallback(() => {
    setShowQrScanner(true);
  }, [setShowQrScanner]);

  return {
    showQrScanner,
    setShowQrScanner,
    openQrScanner,
    closeQrScanner: handleQrScannerClose,
    scanMode,
    setScanMode,
    cameraUnavailable,
    usbScanInputRef,
    onClose: handleQrScannerClose,
    onUsbScanKeyDown: handleUsbScanKeyDown,
    readerElementId,
  };
}
