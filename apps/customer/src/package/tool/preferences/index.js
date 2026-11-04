export {
  //? token
  saveToken,
  loadToken,
  deleteToken,
  //? user
  saveUser,
  loadUser,
  deleteUser,
  //* NavigateData */
  getNavigateData,
  setNavigateData,
  removeNavigateDataKey,
  //* language */
  setLanguage,
  getLanguage,
  //? in game detail
  getUserInGameDetail,
  setUserInGameDetail,
  deleteUserInGameDetail,
  //* referral_code
  saveReferralCode,
  loadReferralCode,
  deleteReferralCode,
  //* referral_code
  saveReferFrom,
  loadReferFrom,
  deleteReferFrom,

  //? chat room channel
  setLogoImage,
  getLogoImage,

  //? home popup image last show
  setLastImageShown,
  getLastImageShown,

  //? checkandAddUserRef
  checkandAddUserRef,

  //? chat room channel
  setChatroomChannel,
  getChatroomChannel,

  //* country id
  getCountryId,
  setCountryId,

  //? Floating Icon Showing
  getFloatingIconShowing,
  setFloatingIconShowing,
  deleteFloatingIconShowing,
  //? ================================================ */
  //? ================== agent part ================== */
  //? ================================================ */
  //? agent token
  saveAgentToken,
  loadAgentToken,
  deleteAgentToken,

  //? agent_referral_code
  saveAgentReferralCode,
  loadAgentReferralCode,
  deleteAgentReferralCode,
} from "./Preferences";
