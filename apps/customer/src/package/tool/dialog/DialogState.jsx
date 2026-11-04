import { atom } from "recoil";

const DialogState = atom({
  key: "DialogState",
  default: {
    content: null,
    swalContent: null,
    pendingList: [],
  },
});

export default DialogState;
