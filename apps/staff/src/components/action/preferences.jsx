import React, { useState } from "react";
import { Preferences } from "@capacitor/preferences";
import { FIXED_BAR } from "../../config/barConfig";

// Create a simple event emitter
class EventEmitter {
  constructor() {
    this.events = {};
  }

  on(event, callback) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);
    return () => this.remove(event, callback);
  }

  remove(event, callback) {
    if (!this.events[event]) return;
    this.events[event] = this.events[event].filter(cb => cb !== callback);
  }

  emit(event, data) {
    if (!this.events[event]) return;
    this.events[event].forEach(callback => callback(data));
  }

  removeAll(event) {
    if (event) {
      delete this.events[event];
    } else {
      this.events = {};
    }
  }
}

// Create a single instance of EventEmitter
export const preferencesEmitter = new EventEmitter();

export { Preferences };

export const saveFcmToken = async (item) => {
  await Preferences.set({
    key: "fcm_token",
    value: item,
  });
};

export const loadFcmToken = async () => {
  const { value } = await Preferences.get({ key: "fcm_token" });
  if (value != null) {
    // console.log("fcm_token: ", value);
  }
  return value;
};

export const deleteFcmToken = async () => {
  await Preferences.remove({ key: "fcm_token" });
};

export const saveToken = async (item) => {
  await Preferences.set({
    key: "token",
    value: item,
  });
  preferencesEmitter.emit("tokenUpdated", item);
};

export const loadToken = async () => {
  const { value } = await Preferences.get({ key: "token" });
  // if (value != null) {
  //   console.log(value);
  // }
  return value;
};

export const deleteToken = async () => {
  await Preferences.remove({ key: "token" });
  await Preferences.remove({ key: "user" });
  preferencesEmitter.emit("tokenUpdated", null);
};

export const saveUser = async (item) => {
  await Preferences.set({
    key: "user",
    value: JSON.stringify(item),
  });
  preferencesEmitter.emit("userUpdated", item);
};

export const loadUser = async () => {
  try {
    const { value } = await Preferences.get({ key: "user" });
    if (!value) {
      return null;
    }

    // Try to parse as JSON
    try {
      const parsed = JSON.parse(value);
      return parsed;
    } catch (parseError) {
      // If parsing fails, the data might be corrupted or invalid
      console.error("Error parsing user data:", parseError);
      console.error("Raw value:", value);

      // Clear corrupted data
      await Preferences.remove({ key: "user" });
      return null;
    }
  } catch (error) {
    console.error("Error loading user data:", error);
    return null;
  }
};

export const loadGlobalData = async () => {
  const { value } = await Preferences.get({ key: "global_data" });
  return value;
};

/** Clears everything that belongs to the previously selected bar's session. */
const clearBarSession = async () => {
  await deleteToken();
  await Preferences.remove({ key: "global_data" });
  await Preferences.remove({ key: "tnc_seen" });
};

/** Selected bar: { id, name, url } where url is the bar's base URL without /api. */
export const saveBar = async (bar) => {
  const previousBar = await loadBar();
  if (previousBar?.url !== bar.url) {
    await clearBarSession();
  }
  await Preferences.set({
    key: "selected_bar",
    value: JSON.stringify({ id: bar.id ?? null, name: bar.name, url: bar.url }),
  });
  preferencesEmitter.emit("barUpdated", bar);
};

const loadStoredBar = async () => {
  const { value } = await Preferences.get({ key: "selected_bar" });
  if (!value) {
    return null;
  }
  try {
    const bar = JSON.parse(value);
    return bar?.url ? bar : null;
  } catch {
    await Preferences.remove({ key: "selected_bar" });
    return null;
  }
};

export const loadBar = async () => {
  if (!FIXED_BAR) {
    return loadStoredBar();
  }

  const storedBar = await loadStoredBar();
  if (storedBar?.url !== FIXED_BAR.url) {
    await clearBarSession();
    await Preferences.set({ key: "selected_bar", value: JSON.stringify(FIXED_BAR) });
  }

  return storedBar?.url === FIXED_BAR.url ? storedBar : FIXED_BAR;
};

export const deleteBar = async () => {
  await clearBarSession();
  await Preferences.remove({ key: "selected_bar" });
  preferencesEmitter.emit("barUpdated", null);
};

export const deleteUser = async () => {
  await Preferences.remove({ key: "user" });
};

const TokenManager = () => {
  const [token, setTokenState] = useState("");

  const loadToken = async () => {
    const { value } = await Preferences.get({ key: "token" });
    setTokenState(value); // Set state to display the token
  };

  const deleteToken = async () => {
    await Preferences.remove({ key: "token" });
    setTokenState(""); // Clear token from state
  };
};

export default TokenManager;
