import { useMemo, useCallback } from "react";
import { useRecoilValue } from "recoil";
import GlobalState from "../../../atoms/GlobalState";
import { CONTAINER_ID, DEFAULT_CHAT_API, USER_TOKEN_API_PATH } from "./config";
import { getUserId } from "./function";
import { call_api } from "@my-common-tool/tool/api";

export default function useSDKConfig() {
  const global = useRecoilValue(GlobalState);

  //? ========================================================
  const SDKConfig = useMemo(() => {
    const cg = global?.livechat_settings?.cgchat || {};

    const apiUrl = cg.chat_api_url || DEFAULT_CHAT_API;
    const platformPublicKey = cg.public_key || "";

    return { apiUrl, platformPublicKey };
  }, [global?.livechat_settings]);

  const { apiUrl, platformPublicKey } = SDKConfig;

  const isSDKConfigReady = useMemo(() => {
    return !!platformPublicKey;
  }, [platformPublicKey]);
  //? ======================================================================

  const onNewMessage = useCallback((message) => {
    console.log(`[Chatroom onNewMessage] :`, message);
  }, []);

  const onUnreadCountChange = useCallback((count) => {
    console.log(`[Chatroom onUnreadCountChange] :`, count);
  }, []);

  const commonConfig = useMemo(() => {
    return {
      apiUrl,
      platformPublicKey,
      displayMode: "inline",
      container: `#${CONTAINER_ID}`,
      onNewMessage,
      onUnreadCountChange,
      // onTransferToHuman: function (data) {},
      // onChannelClosed: function (data) {},
      // onRatingSubmitted: function (data) {},
    };
  }, [apiUrl, platformPublicKey, onNewMessage, onUnreadCountChange]);
  //? ======================================================================
  const guestConfig = useMemo(() => {
    return {
      ...commonConfig,
      isGuest: true,
      userId: undefined,
      getUserToken: undefined,
      language: "en",
    };
  }, [commonConfig]);

  const getUserConfig = useCallback(
    (userData) => {
      const uid = getUserId(userData);
      // 呼叫後端 live_chat_2_user_token（需 header: token, country-id），回傳 { userToken }
      return {
        ...commonConfig,
        isGuest: false,
        userId: uid,
        getUserToken: async () => {
          try {
            const res = await call_api(USER_TOKEN_API_PATH);
            return res?.userToken ?? res?.user_token ?? null;
          } catch (error) {
            return undefined;
          }
        },
        language: userData?.language || "en",
      };
    },
    [commonConfig],
  );
  //? ======================================================================

  return {
    isSDKConfigReady,

    SDKConfig,

    guestConfig,
    getUserConfig,
  };
}
