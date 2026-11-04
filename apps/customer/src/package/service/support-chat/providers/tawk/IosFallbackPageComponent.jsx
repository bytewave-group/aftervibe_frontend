import React, { useState, useEffect, useRef } from "react";
import { useRecoilValue } from "recoil";
import { useTranslation } from "react-i18next";
import { handleMessage } from "./utils";

export default function IosFallbackPageComponent(props) {
  useEffect(() => {
    window.addEventListener("message", handleMessage);

    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, []);

  return null;
}
