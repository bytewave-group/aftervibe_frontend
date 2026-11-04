import React, { useState, useEffect, useRef } from "react";
import { useRecoilValue } from "recoil";
import { useTranslation } from "react-i18next";
import useDepositChannelMessage from "./useDepositChannelMessage";

export default function useDepositResultListener({ onSuccess, onFailed }) {
  const { onDepositResult, subscribe } = useDepositChannelMessage();

  useEffect(() => {
    const off = onDepositResult((data = {}) => {
      const { status, ...payload } = data ?? {};

      if (data.status === "success") {
        onSuccess?.(payload);
      } else if (status === "failed") {
        onFailed?.(payload);
      } else {
        // console.warn("UNKNOWN_STATUS", status); //hide it when upload
      }
    });

    return off;
  }, [onSuccess, onFailed]);
}
