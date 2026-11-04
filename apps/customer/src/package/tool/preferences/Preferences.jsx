import { Preferences } from "@capacitor/preferences";
import appConfig from "../../../../appconfig.json";

const prefix = appConfig.variable_prefix || "";

const safeParse = (value, fallback = {}) => {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    console.error("ERROR WHEN parse JSON");
    return fallback;
  }
};

//? ================================================ */
//? token
export const saveToken = async (item) => {
  await Preferences.set({
    key: `token_${prefix}`,
    value: item,
  });
};

export const loadToken = async () => {
  const { value } = await Preferences.get({ key: `token_${prefix}` });
  return value;
};

export const deleteToken = async () => {
  await Preferences.remove({ key: `token_${prefix}` });
  await Preferences.remove({ key: `user_${prefix}` });
};
//? ================================================ */
//? user
export const saveUser = async (item) => {
  await Preferences.set({
    key: `user_${prefix}`,
    value: JSON.stringify(item),
  });
};

export const loadUser = async () => {
  const { value } = await Preferences.get({ key: `user_${prefix}` });
  return value ? safeParse(value) : null;
};

export const deleteUser = async () => {
  await Preferences.remove({ key: `user_${prefix}` });
};
//* ================================================ */
//* NavigateData */
export const getNavigateData = async () => {
  const { value } = await Preferences.get({ key: "navigate_data" });
  return value ? safeParse(value) : {};
};

export const setNavigateData = async (obj) => {
  const existing = await getNavigateData();

  const existingData = existing;

  const merged = {
    ...existingData,
    ...obj,
  };

  await Preferences.set({
    key: "navigate_data",
    value: JSON.stringify(merged),
  });
};

export const removeNavigateDataKey = async (key) => {
  const existing = await getNavigateData();
  const { [key]: removed, ...rest } = existing;
  await Preferences.set({
    key: "navigate_data",
    value: JSON.stringify(rest),
  });
};
//* ================================================ */
//* language */
export const setLanguage = async (item) => {
  await Preferences.set({
    key: "lng",
    value: item,
  });
};

export const getLanguage = async () => {
  const { value } = await Preferences.get({ key: "lng" });
  return value;
};
//? ================================================ */
//? in game detail
export const getUserInGameDetail = async () => {
  const { value } = await Preferences.get({ key: "userInGameDetail" });
  return value ? safeParse(value) : {};
};
export const setUserInGameDetail = async (item) => {
  await Preferences.set({
    key: "userInGameDetail",
    value: JSON.stringify(item),
  });
};
export const deleteUserInGameDetail = async () => {
  await Preferences.remove({ key: "userInGameDetail" });
};
//* ================================================ */
//* referral_code
export const saveReferralCode = async (item) => {
  await Preferences.set({
    key: "referral_code",
    value: item,
  });
};
export const loadReferralCode = async () => {
  const { value } = await Preferences.get({ key: "referral_code" });
  return value;
};
export const deleteReferralCode = async () => {
  await Preferences.remove({ key: "referral_code" });
};
//* ================================================ */
//*  refer_from
export const saveReferFrom = async (item) => {
  await Preferences.set({
    key: "refer_from",
    value: item,
  });
};
export const loadReferFrom = async () => {
  const { value } = await Preferences.get({ key: "refer_from" });
  return value;
};
export const deleteReferFrom = async () => {
  await Preferences.remove({ key: "refer_from" });
};
/* ================================================ */
// chat room channel
export const setChatroomChannel = async (item) => {
  await Preferences.set({
    key: "chatroom_channel",
    value: item,
  });
};
export const getChatroomChannel = async () => {
  const { value } = await Preferences.get({ key: "chatroom_channel" });
  return value;
};
/* ================================================ */
export const setLogoImage = async (logoLink) => {
  await Preferences.set({
    key: "logo_image",
    value: String(logoLink),
  });
};
export const getLogoImage = async () => {
  const { value } = await Preferences.get({ key: "logo_image" });
  return value;
};
/* ================================================ */
//? home popup image last show
export const setLastImageShown = async (timestamp) => {
  await Preferences.set({
    key: "last_image_shown",
    value: String(timestamp),
  });
};
export const getLastImageShown = async () => {
  const { value } = await Preferences.get({ key: "last_image_shown" });
  return value;
};
/* ================================================ */
//? home popup image last show
const setUserRefs = async (arr) => {
  await Preferences.set({
    key: "userRefs",
    value: JSON.stringify(arr),
  });
};
const getUserRefs = async () => {
  const { value } = await Preferences.get({ key: "userRefs" });
  return value ? safeParse(value, []) : [];
};

export const checkandAddUserRef = async (ref) => {
  const refs = await getUserRefs();

  if (!refs.includes(ref)) {
    const updated = [...refs, ref];
    await setUserRefs(updated);
    return true;
  }

  return false;
};
/* ================================================ */
export const getCountryId = async () => {
  const { value } = await Preferences.get({ key: "country_id" });
  return value;
};
export const setCountryId = async (item) => {
  await Preferences.set({
    key: "country_id",
    value: item,
  });
};
/* ================================================ */
//? Floating Icon Showing
export const getFloatingIconShowing = async () => {
  const { value } = await Preferences.get({ key: "floating_icon_showing" });
  return value ? JSON.parse(value) : {};
};

export const setFloatingIconShowing = async (item) => {
  await Preferences.set({
    key: "floating_icon_showing",
    value: JSON.stringify(item),
  });
};

export const deleteFloatingIconShowing = async () => {
  await Preferences.remove({ key: "floating_icon_showing" });
};
//? ================================================ */
//? agent token
export const saveAgentToken = async (item) => {
  await Preferences.set({
    key: `agent_token_${prefix}`,
    value: item,
  });
};

export const loadAgentToken = async () => {
  const { value } = await Preferences.get({ key: `agent_token_${prefix}` });
  return value;
};

export const deleteAgentToken = async () => {
  await Preferences.remove({ key: `agent_token_${prefix}` });
};
//? agent_referral_code
export const saveAgentReferralCode = async (item) => {
  await Preferences.set({
    key: "agent_referral_code",
    value: item,
  });
};
export const loadAgentReferralCode = async () => {
  const { value } = await Preferences.get({ key: "agent_referral_code" });
  return value;
};
export const deleteAgentReferralCode = async () => {
  await Preferences.remove({ key: "agent_referral_code" });
};
