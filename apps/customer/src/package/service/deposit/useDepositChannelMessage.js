import React, { useState, useEffect, useRef } from "react";
import { useRecoilValue } from "recoil";
import { useTranslation } from "react-i18next";
import { useTabChannelMessage } from "@my-common-tool/tool/tab-channel-message";

export default function useDepositChannelMessage() {
  const { send, subscribe } = useTabChannelMessage("deposit", {
    ignoreSelf: true,
  });

  const sendDepositStatus = (status = "", payload) => {
    send({
      type: "DEPOSIT_RESULT",
      data: {
        status,
        ...payload,
      },
    });
  };

  const onDepositResult = (callback) => {
    return subscribe("DEPOSIT_RESULT", callback);
  };

  return { sendDepositStatus, onDepositResult, subscribe };
}
