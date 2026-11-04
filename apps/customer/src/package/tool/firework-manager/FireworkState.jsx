import { atom } from "recoil";

const FireworkState = atom({
  key: "FireworkState",
  default: {
    show: false,
  },
});

export default FireworkState;
