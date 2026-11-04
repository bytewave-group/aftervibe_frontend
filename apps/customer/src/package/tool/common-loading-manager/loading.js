import { f7 } from "framework7-react";
import appConfig from "../../../../appconfig.json";
import { setRecoil } from "recoil-nexus";
import LoadingState from "./LoadingState";
import { useRecoilState, useRecoilValue } from "recoil";
import { useEffect } from "react";

let is_custom_loading = !!appConfig.use_custom_loading;

export function open_loading() {
  if (is_custom_loading) {
    setRecoil(LoadingState, true);
  } else {
    f7.preloader.show();
  }
}

export function close_loading() {
  if (is_custom_loading) {
    setRecoil(LoadingState, false);
  } else {
    f7.preloader.hide();
  }
}

export const useLoading = () => {
  const [show_loading, set] = useRecoilState(LoadingState);

  return {
    show_loading,
  };
};
