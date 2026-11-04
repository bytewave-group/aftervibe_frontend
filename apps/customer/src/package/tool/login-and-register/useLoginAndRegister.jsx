import { f7 } from "framework7-react";
import { getRecoil, setRecoil } from "recoil-nexus";
import { useRecoilState, useRecoilValue } from "recoil";
import { useEffect } from "react";
import LoginRegisterState from "./LoginRegisterState";
import { navigate } from "../navigate";

import appConfig from "../../../../appconfig.json";

const is_full_page = appConfig.is_full_page_login;

/**
 * Vite / Puppeteer prerender (and custom prerender.mjs) run the real app. Without this,
 * RedirectToLoginRegister calls open_* and the captured static HTML has the login/register
 * modal "open" even though the user never clicked — and hydration can show the same.
 */
function isPrerenderEnv() {
  if (typeof window === "undefined") {
    return true;
  }
  return !!(
    window.__PRERENDER__ ||
    window?.__PRERENDER_INJECTED?.__IS_PRERENDER
  );
}

export function open_login() {
  // skip if prerender
  if (isPrerenderEnv()) {
    return;
  }
  if (is_full_page) {
    navigate("/login");
    return;
  }

  setRecoil(LoginRegisterState, "login");
}

export function open_register() {
  // skip if prerender
  if (isPrerenderEnv()) {
    return;
  }
  if (is_full_page) {
    navigate("/register");
    return;
  }
  setRecoil(LoginRegisterState, "register");
}

export function open_forgot_password() {
  // skip if prerender
  if (isPrerenderEnv()) {
    return;
  }
  if (is_full_page) {
    navigate("/forgot_password");
    return;
  }

  setRecoil(LoginRegisterState, "forgot_password");
}

export function close_login_register() {
  if (is_full_page) {
    navigate("/");
    return;
  }

  setRecoil(LoginRegisterState, null);
}

export const useLoginAndRegister = () => {
  const openedPopup = useRecoilValue(LoginRegisterState);

  return {
    close_login_register,
    openedPopup,
  };
};
