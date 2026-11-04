import { setRecoil } from "recoil-nexus";
import SoundState from "./SoundState";

export const changeIsPlaying = (key = "bgm") => {
  setRecoil(SoundState, (prev) => ({
    ...prev,
    [key]: {
      ...prev?.[key],
      isPlaying: !prev?.[key]?.isPlaying,
    },
  }));
};

export const changeVolume = (value = "", key = "bgm") => {
  setRecoil(SoundState, (prev) => ({
    ...prev,
    [key]: {
      ...prev?.[key],
      volume: value,
    },
  }));
};

export const changeBGM = (value = "") => {
  setRecoil(SoundState, (prev) => ({
    ...prev,
    bgm: {
      ...prev?.bgm,
      name: value,
    },
  }));
};
