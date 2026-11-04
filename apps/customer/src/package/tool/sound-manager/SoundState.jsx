import { atom } from "recoil";

const SoundState = atom({
  key: "soundState",
  default: {
    bgm: {
      name: "",
      volume: 0,
      isPlaying: false,
    },
    se: {
      volume: 0,
    },
  },
});

export default SoundState;
