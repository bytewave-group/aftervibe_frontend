import { useEffect } from "react";
import { useRecoilValue, useSetRecoilState } from "recoil";
//? ======================================================================
//* common part
import { useTokenAndUser } from "../../../components/action/user-data";
import GlobalState from "../../../atoms/GlobalState";
//? ======================================================================
import useSDKConfig from "./useSDKConfig";
import useChatContainer from "./useChatContainer";
import useSDKInit from "./useSDKInit";
import useChatroomMessage from "./useChatroomMessage";
import ChatWidgetNewState from "./ChatWidgetNewState";

import { usePathname } from "@my-common-tool/tool/navigate";

/**
 * Chat SDK Manager – 與舊 widget 一樣：全域一個容器，只在 /live_chat 顯示，離開只 hidden，不重新 init。
 * 配置來自 global.livechat_settings.cgchat。
 */
const ChatSDKManager = () => {
  const { isLoading } = useTokenAndUser();
  const global = useRecoilValue(GlobalState);
  const setChatWidgetState = useSetRecoilState(ChatWidgetNewState);
  const pathname = usePathname();
  //! ======================================================================
  //! Skip Chat SDK initialization during prerender.
  //! Chat SDK relies on browser APIs and should only be mounted
  //! after client hydration.
  if (window?.["__PRERENDER_INJECTED"]?.["__IS_PRERENDER"]) {
    return null;
  }
  //! ======================================================================

  //? Subscribe to chat message events and manage
  //? unread count / notification sound globally.
  useChatroomMessage();

  //? Bootstrap Chat SDK lifecycle.
  const { isSDKConfigReady, ...restConfig } = useSDKConfig();

  const canInitializeChat =
    global?.theme !== "blank" && !isLoading && isSDKConfigReady;

  const { hideContainer, showContainer, isContainerExist } = useChatContainer({
    isReady: canInitializeChat,
  });

  const { scrollToBottom } = useSDKInit({
    isContainerExist,
    config: restConfig,
  });

  //! = ======================================================================

  useEffect(() => {
    if (isContainerExist && pathname.startsWith("/live_chat")) {
      showContainer();
      setChatWidgetState((prev) => ({ ...prev, unreadCount: 0 }));
      setTimeout(() => {
        try {
          scrollToBottom?.();
        } catch {}
      }, 0);
    } else {
      hideContainer();
    }
  }, [isContainerExist, pathname]);

  return null;
};

export default ChatSDKManager;
