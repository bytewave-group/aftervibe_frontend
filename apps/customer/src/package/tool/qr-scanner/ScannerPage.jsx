import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "framework7-react";
import { IoCloseCircle } from "react-icons/io5";
import useScanCode from "./useScanCode";

const qrBox = {
  width: "250px",
  height: "250px",
};

export default function ScannerPage({ onSubmit }) {
  const { t } = useTranslation();

  const { scanStart, qrScannerId } = useScanCode({
    fps: 10,
  });

  useEffect(() => {
    handleOpenScaner();
  }, []);

  const handleOpenScaner = async () => {
    await new Promise((resolve) =>
      setTimeout(() => {
        resolve(true);
      }, 500),
    );

    try {
      const res = await scanStart();

      if (res?.status) {
        handleScanCode(res?.result);
      } else {
        onSubmit(false, res?.error);
      }
    } catch (error) {
      console.error(
        "error , can not open scan ,please contact customer service",
      );
    }
  };

  //? ============================================================
  const handleScanCode = (result) => {
    onSubmit(true, result);
  };
  //? ============================================================

  return (
    <div className="bg-black h-100">
      <div
        id={qrScannerId}
        className="scan-container pointer-none position-absolute top-0 start-0 w-100 h-100"
      />
      <div className="position-absolute top-0 start-0 w-100 h-100 p-3">
        <div className="position-relative d-flex-center w-100 h-100">
          <div className="position-absolute end-0 top-0 m-4">
            <Button
              onClick={() => onSubmit("backClick")}
              className=" px-0 minh-fit minw-fit w-fit ms-auto"
            >
              <IoCloseCircle className="text32 text-md40" />
            </Button>
          </div>
          <div className="">
            <div className="qr-scanner-header">
              <div className="text-gradient bg-gold-title text-center text24 text-md32 fw-bold mb-12 mb-md-3">
                {t("Scan QR Code")}
              </div>
            </div>

            <div id="qr-reader-container">
              <div style={{ ...qrBox }} className="border-white">
                <ScannerBorder />
              </div>
            </div>
          </div>{" "}
        </div>
      </div>
      {/* <Button
              onClick={handleOpenFile}
              style={{
                width: `${qrBox?.width}px`,
              }}
              className="btn-primary d-block py-12 mt-12 mx-auto"
            >
              {t("Scan from album")}
            </Button> */}
    </div>
  );
}

const ScannerBorder = () => {
  const corners = [
    { position: "top-0 start-0", border: "border-top-5 border-start-5" },
    { position: "top-0 end-0", border: "border-top-5 border-end-5" },
    { position: "bottom-0 start-0", border: "border-bottom-5 border-start-5" },
    { position: "bottom-0 end-0", border: "border-bottom-5 border-end-5" },
  ];
  return (
    <div className="scan-frame position-relative w-100 h-100">
      {corners.map((corner, index) => (
        <div
          key={index}
          className={`icon32 position-absolute ${corner.position} ${corner.border}`}
        />
      ))}
    </div>
  );
};
