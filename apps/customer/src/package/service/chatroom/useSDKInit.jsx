import { useState, useEffect, useRef, useCallback } from "react";
import { getUserId } from "./function";
import { useTokenAndUser } from "../../../components/action/user-data";
import { CHAT_SDK_SCRIPT } from "./config";

export default function useSDKInit({ isContainerExist, config }) {
  const sdkRef = useRef();
  const { SDKConfig, getUserConfig, guestConfig } = config;
  const { platformPublicKey } = SDKConfig;
  const { user, token } = useTokenAndUser();

  const sdkInitializedRef = useRef(false);

  //? ========================================================================
  const initSDK = useCallback((config) => {
    const ChatRoom = window.ChatRoom;
    if (!ChatRoom || typeof ChatRoom.init !== "function") return null;
    if (sdkRef.current) {
      try {
        sdkRef.current.destroy();
      } catch (e) {}
      sdkRef.current = null;
    }
    sdkRef.current = ChatRoom.init(config);
    return sdkRef.current;
  }, []);

  const runInit = useCallback(() => {
    if (!platformPublicKey) return;
    const userId = getUserId(user);
    const isUser = !!token;
    const config = isUser ? getUserConfig(user) : guestConfig;
    console.log("[ChatSDKManager] runInit", {
      isGuest: !isUser,
      isUser,
      userId,
      hasToken: !!token,
      token: token ? `${String(token).slice(0, 8)}...` : null,
      hasGetUserToken: !!config.getUserToken,
      userKeys: user ? Object.keys(user) : [],
    });
    initSDK(config);
    sdkInitializedRef.current = true;
  }, [token, user, platformPublicKey, getUserConfig, guestConfig, initSDK]);
  //? ========================================================================
  //? Load Script
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const scriptLoadedRef = useRef(null);

  useEffect(() => {
    if (!platformPublicKey || !isContainerExist) return;

    const existingScript = document.querySelector(
      `script[src="${CHAT_SDK_SCRIPT}"]`,
    );

    if (existingScript) {
      setScriptLoaded(true);
      scriptLoadedRef.current = true;
      return;
    }

    if (typeof window.process === "undefined") {
      window.process = { env: { NODE_ENV: "production" } };
    }

    const script = document.createElement("script");
    script.src = CHAT_SDK_SCRIPT;
    script.async = true;
    script.onload = () => {
      setScriptLoaded(true);
      scriptLoadedRef.current = true;
      console.log("[ChatSDKManager] script onload, first init", {
        userId: user?.id,
        hasToken: !!token,
      });
      if (!sdkInitializedRef.current) runInit();
    };
    script.onerror = () => {
      console.error("[ChatSDKManager] Failed to load chat-sdk script");
    };
    document.body.appendChild(script);
  }, [platformPublicKey, isContainerExist]);
  //? ========================================================================

  useEffect(() => {
    const uid = getUserId(user);
    console.log("[ChatSDKManager] effect user/token", {
      userId: uid,
      userKeys: user ? Object.keys(user) : [],
      hasToken: !!token,
      scriptLoaded: scriptLoadedRef.current,
      initDone: sdkInitializedRef.current,
      hasChatRoom: !!window.ChatRoom,
    });
    if (window.ChatRoom && scriptLoaded && sdkInitializedRef.current) {
      runInit();
    }
  }, [user?.code, token]);

  useEffect(() => {
    window.reinitChatSDKAsGuest = () => {
      if (!window.ChatRoom) return;
      initSDK(guestConfig);
    };
    window.reinitChatSDKAsUser = (userData) => {
      if (!userData?.id || !window.ChatRoom) return;
      initSDK(getUserConfig(userData));
    };

    if (typeof window.process === "undefined") {
      window.process = {
        env: { NODE_ENV: "production", __IS_FALLBACK: true },
      };
    }

    return () => {
      delete window.reinitChatSDKAsGuest;
      delete window.reinitChatSDKAsUser;

      if (sdkRef.current) {
        try {
          sdkRef.current.destroy();
        } catch (e) {}
        sdkRef.current = null;
      }
      sdkInitializedRef.current = false;
    };
  }, []);

  return {
    scrollToBottom: () => sdkRef.current?.scrollToBottom?.(),
  };
}
