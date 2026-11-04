import { atom } from "recoil";

const ChatWidgetState = atom({
  key: "ChatWidgetState",
  default: {
    isInitialized: false,
    isReady: false,
    triggerReload: 0,
    unreadCount: 0,
  },
});

export default ChatWidgetState;
