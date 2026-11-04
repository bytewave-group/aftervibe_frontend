import React, { useState, useEffect, useRef } from "react";
import { useRecoilValue } from "recoil";
import { getI18n, useTranslation } from "react-i18next";
import { Button } from "framework7-react";

export default function DefaultConfirmDialog({ data, onSubmit }) {
  const t = getI18n().t;

  return (
    <>
      <div className="">
        {data?.titleText && (
          <div className="text24 mb-4">{t(data?.titleText)}</div>
        )}
        <div className="text16 mb-4">{t(data?.message)}</div>
      </div>

      <div className="dialog-buttons px-0 pb-0 h-fit">
        <Button
          onClick={() => onSubmit?.(false, null)}
          className={`dialog-button minh-40 d-flex-center no-btn-color`}
        >
          {t(data?.cancelText ? data?.cancelText : "Cancel")}
        </Button>
        <Button
          onClick={() => onSubmit?.(true, null)}
          className={`dialog-button minh-40 d-flex-center no-btn-color`}
        >
          {t(data?.confirmText ? data?.confirmText : "Confirm")}
        </Button>
      </div>
    </>
  );
}
