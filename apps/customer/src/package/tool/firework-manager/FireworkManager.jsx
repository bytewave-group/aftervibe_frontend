import React, { useState, useEffect, useRef } from "react";
import { useRecoilState, useRecoilValue } from "recoil";
import { useTranslation } from "react-i18next";
import { Fireworks } from "@fireworks-js/react";
import FireworkState from "./FireworkState";
import { v4 as uuidv4 } from "uuid";

const createUUID = () => {
  const u = uuidv4();

  return `uuid-${u}`;
};

export default function FireworkManager({
  config,
  onUniqueClassNameGenerated,
  className,
  style,

  displayMode = "fixed",

  name = "",
}) {
  const uuidRef = useRef(createUUID());

  const ref = useRef(null);

  const [fireworkState, setFireworkState] = useRecoilState(FireworkState);

  const { show } = fireworkState;

  useEffect(() => {
    if (typeof onUniqueClassNameGenerated === "function") {
      onUniqueClassNameGenerated(uuidRef.current);
    }
  }, []);

  // console.log(ref?.current?.currentOptions);

  return (
    <Fireworks
      id="firework-manager"
      ref={ref}
      style={{
        zIndex: displayMode === "fixed" ? 6000 : 0,
        ...style,
      }}
      className={`${uuidRef.current} ${className} pointer-none ${displayMode === "fixed" ? `position-fixed top-0 start-0` : displayMode === "absolute" ? "position-absolute top-0 start-0" : ""} w-100 h-100 `}
      options={{
        ...config,
        delay: {
          min: 10,
          max: 10,
        },
      }}
    />
  );
}
