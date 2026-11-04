import axios from "axios";
import { loadBar, loadToken } from "../components/action/preferences";

const api_file = axios.create({
  headers: {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "multipart/form-data",
  },
});

api_file.interceptors.request.use(async (config) => {
  const bar = await loadBar();
  if (!bar?.url) {
    throw new axios.CanceledError("No bar selected");
  }
  config.baseURL = `${bar.url}/api`;

  config.headers["token"] = await loadToken() || null;
  config.params = { ...config.params, locale: localStorage.getItem("language") ?? "en" };
  return config;
});

export default api_file;
