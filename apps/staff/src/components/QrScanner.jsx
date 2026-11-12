import React from "react";
import { Icon } from "framework7-react";
import { useTranslation } from "../services/useTranslation";
import { useQrScanner } from "../hooks/useQrScanner";

function QrScannerView({
  showQrScanner,
  scanMode,
  setScanMode,
  cameraUnavailable,
  readerElementId,
  usbScanInputRef,
  onClose,
  onUsbScanKeyDown,
  title,
}) {
  const { t } = useTranslation();

  if (!showQrScanner) return null;

  return (
    <div className="qr-scanner-modal">
      <div className="qr-scanner-content">
        <div className="qr-scanner-header">
          <h3 className="font-large font-bold">{title ?? t("Scan QR Code")}</h3>
          <div className="qr-scanner-close" onClick={onClose}>
            <Icon f7="xmark" className="font-large" />
          </div>
        </div>
        {scanMode === null && (
          <div className="qr-scanner-mode-choice">
            <p className="qr-scanner-mode-choice-title">{t("Choose scan method")}</p>
            <div className="qr-scanner-mode-buttons">
              <button type="button" className="qr-scanner-mode-btn" onClick={() => setScanMode("camera")}>
                <Icon f7="camera_fill" className="qr-scanner-mode-icon" />
                <span>{t("Use camera")}</span>
              </button>
              <button type="button" className="qr-scanner-mode-btn" onClick={() => setScanMode("usb")}>
                <Icon f7="barcode" className="qr-scanner-mode-icon" />
                <span>{t("Use USB scanner")}</span>
              </button>
            </div>
          </div>
        )}
        {scanMode === "camera" && !cameraUnavailable && (
          <div id={readerElementId} className="qr-reader-container" />
        )}
        {(scanMode === "usb" || (scanMode === "camera" && cameraUnavailable)) && (
          <div className="qr-reader-container qr-reader-placeholder">
            <p className="qr-reader-placeholder-text">
              {scanMode === "usb"
                ? t("Scan with USB barcode scanner")
                : t("Camera unavailable. Use USB scanner to scan.")}
            </p>
          </div>
        )}
        {scanMode === "camera" && !cameraUnavailable && (
          <div className="qr-scanner-instructions">
            <p>{t("Position the QR code within the frame")}</p>
          </div>
        )}
        {(scanMode === "camera" || scanMode === "usb") && (
          <input
            ref={usbScanInputRef}
            type="text"
            className="usb-scan-input"
            style={{ position: "absolute", opacity: 0, width: "1px", height: "1px", left: "-9999px" }}
            aria-hidden="true"
            autoComplete="off"
            inputMode="none"
            onKeyDown={onUsbScanKeyDown}
          />
        )}
      </div>
    </div>
  );
}

/**
 * Combined USB + camera scanner modal. Pass `active` / `onActiveChange` for controlled usage,
 * or omit them and call `openQrScanner` via the exported `useQrScanner` hook.
 */
export default function QrScanner({
  readerElementId,
  onDecoded,
  isProcessingScanRef,
  active,
  onActiveChange,
  enabled = true,
  onClose,
  showPreloaderOnCameraScan = true,
  title,
}) {
  const scanner = useQrScanner({
    readerElementId,
    onDecoded,
    isProcessingScanRef,
    active,
    onActiveChange,
    enabled,
    onClose,
    showPreloaderOnCameraScan,
  });

  return <QrScannerView {...scanner} title={title} />;
}

export { useQrScanner };
