import { useState, useEffect, useRef } from "react";
import { useRecoilState, useRecoilValue } from "recoil";
import { Howl } from "howler";
import SoundState from "./SoundState";
import { getRecoil, setRecoil } from "recoil-nexus";

const DEFAULT_BGM_NAME = "global_bgm";
const DEFAULT_BGM_VOLUME = 0.2;

const audioMap = {
  global_bgm: {
    src: ["/assets/sound/bgm.mp3"],
    loop: true,
  },
};

const sound_name_list = Object.keys(audioMap);
//* ================================================================
//? get state hook
export const useSound = () => {
  const soundState = useRecoilValue(SoundState);
  return {
    ...soundState,
  };
};
//* ================================================================
//?Manager , must add to app.jsx
export default function SoundManager(props) {
  const [soundState, setSoundState] = useRecoilState(SoundState);

  const { bgm, se } = soundState;

  /* ================================================================== */
  //? Init and create All Sound Instance
  const currentBGMRef = useRef(null);
  const soundInstancesRef = useRef({});

  useEffect(() => {
    const instances = {};

    // create all sound instances
    sound_name_list.forEach((sound_name) => {
      const audio = audioMap?.[sound_name];
      const defaultParam = {
        src: audio?.src,
        volume: DEFAULT_BGM_VOLUME,
        loop: audio?.loop ?? false,
        autoplay: false,
      };
      const sound = new Howl(defaultParam);

      instances[sound_name] = sound;
    });

    soundInstancesRef.current = instances;

    return () => {
      Object.values(instances).forEach((sound) => {
        sound.stop();
        sound.unload();
      });
    };
  }, []);
  /* ================================================================== */
  //? set default bgm
  useEffect(() => {
    setSoundState((prev) => {
      if (!prev?.bgm?.name) {
        return {
          ...prev,
          bgm: {
            ...prev?.bgm,
            name: DEFAULT_BGM_NAME,
            isPlaying: true,
            volume: DEFAULT_BGM_VOLUME,
          },
        };
      } else {
        return prev;
      }
    });
  }, []);

  /* ================================================================== */

  useEffect(() => {
    if (!bgm?.name) return;

    const nextBGM = soundInstancesRef.current?.[bgm.name];

    if (!nextBGM) return;

    if (currentBGMRef.current !== nextBGM) {
      currentBGMRef.current?.stop();

      currentBGMRef.current = nextBGM;
    }

    const currentBGM = currentBGMRef.current;

    if (!bgm?.isPlaying) {
      currentBGM.pause();
    } else if (!currentBGM.playing() && !!bgm?.isPlaying) {
      currentBGM.play();
    }
  }, [bgm?.isPlaying, bgm?.name]);

  useEffect(() => {
    if (!bgm?.name) return;

    const currentBGM = currentBGMRef.current;

    if (!currentBGM) return;

    const currentVolume = currentBGM.volume();
    const nextVolume = bgm?.volume;

    if (currentVolume !== nextVolume) {
      currentBGM.volume(bgm?.volume);
    }
  }, [bgm?.volume]);

  /* ======================================================== */
  //? visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (currentBGMRef.current) {
        const state = getRecoil(SoundState);
        const bgm = state?.bgm;
        const enableToPlay = bgm?.isPlaying;

        const isHidden = document?.hidden;
        if (isHidden) {
          currentBGMRef.current?.pause();
        } else {
          if (enableToPlay && !currentBGMRef.current.playing()) {
            currentBGMRef.current.play();
          }
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);
  /* ======================================================== */
  return null;
}
