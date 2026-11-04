import { atom } from "recoil";

const ChatWidgetNewState = atom({
  key: "ChatWidgetNewState",
  default: {
    isInitialized: false,
    isReady: false,
    triggerReload: 0,
    unreadCount: 0,
  },
});

export default ChatWidgetNewState;
