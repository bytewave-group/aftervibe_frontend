// atoms/languageAtom.js
import { atom } from "recoil";

const LiveChatState = atom({
  key: "LiveChatState",
  default: {
    is_ready: false,
    is_show: false,
  },
});

export default LiveChatState;
