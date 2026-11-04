import { setRecoil } from "recoil-nexus";
import FireworkState from "./FireworkState";

export function show_firework() {
  setRecoil(FireworkState, (prev) => ({ ...prev, show: true }));
}

export function hide_firework() {
  setRecoil(FireworkState, (prev) => ({ ...prev, show: false }));
}
