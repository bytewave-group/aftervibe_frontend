import axios from "axios";
import { loadBar, loadToken } from "../components/action/preferences";
import { Preferences } from "@capacitor/preferences";

const api = axios.create({
  headers: {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(async (config) => {
  const bar = await loadBar();
  if (!bar?.url) {
    throw new axios.CanceledError("No bar selected");
  }
  config.baseURL = `${bar.url}/api`;

  config.headers["token"] = await loadToken() || null;

  // config.params = { ...config.params, locale: localStorage.getItem("lng") ?? "en" };
  const { value } = await Preferences.get({ key: "language" });
  config.params = { ...config.params, locale: value || "en" };
  return config;
});

export default api;
