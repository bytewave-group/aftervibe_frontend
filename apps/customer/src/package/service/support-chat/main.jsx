import React, { useState, useEffect, useRef, useMemo } from "react";
import { useRecoilValue } from "recoil";
import { useTranslation } from "react-i18next";

import appConfig from "../../../../appconfig.json";

const DEFAULT_SUPPORT_CHAT_PROVIDER = "chatroom";

//? tawk || livechat || chatroom
const CHAT_PROVIDER =
  appConfig?.support_chat_type || DEFAULT_SUPPORT_CHAT_PROVIDER;

import { TawkManager } from "./providers/tawk/TawkManager";
import { useTawkChatControl } from "./providers/tawk/useTawkChatControl";
import LiveChatManager from "./providers/livechat/LiveChatManager";

export const createSupportChatAdapter = (provider) => {
  switch (provider) {
    case "tawk":
      return TawkManager;

    case "livechat":
      return LiveChatManager;

    case "chatroom":
      return null;
    // return ChatroomManager; //TODO:

    default:
      return null;
  }
};

const getHookControl = () => {
  switch (CHAT_PROVIDER) {
    case "tawk":
      return useTawkChatControl;

    case "livechat":
      return () => {}; //TODO

    case "chatroom":
      return () => {}; //TODO

    default:
      return null;
  }
};

export const useSupportChatControl = () => {
  const hook = getHookControl();

  const { open_support_chat, close_support_chat } = hook();

  return {
    open_support_chat,
    close_support_chat,
  };
};

export const open_support_chat = () => {};
export const close_support_chat = () => {};

export function SupportChatManager(props) {
  const Manager = useMemo(() => {
    switch (CHAT_PROVIDER) {
      case "tawk":
        return TawkManager;

      case "livechat":
        return LiveChatManager;

      case "chatroom":
        return null; //TODO
      // return ChatroomManager;

      default:
        return null;
    }
  }, []);

  if (!Manager) return null;

  return <Manager {...props} />;
}
