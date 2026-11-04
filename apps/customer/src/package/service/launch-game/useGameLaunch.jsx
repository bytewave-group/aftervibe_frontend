import React, { useState, useEffect, useRef } from "react";
import { useRecoilValue } from "recoil";
import { useTranslation } from "react-i18next";
import { close_loading, open_loading } from "@my-common-tool/tool/loading";

import { show_toast } from "@my-common-tool/tool/toast";
import { loadToken, setNavigateData } from "@my-common-tool/tool/preferences";
import { navigate } from "@my-common-tool/tool/navigate";
import { open_dialog_component } from "@my-common-tool/tool/dialog";
import { get_game_statistics, launch } from "@my-common-tool/tool/api";

import useUserInGame from "../user-in-game/useUserInGame";
import appConfig from "../../../../appconfig.json";
import { useCasinoCatalogDataNew } from "../all-game-page";
import GlobalState from "../../../atoms/GlobalState";
//?:
//!!
import GameLaunchDialog from "./GameLaunchDialog";
import DialogApp from "./../../../components/modal/dialog-app";
import { openNewTabCrossPlatform } from "@my-common-tool/tool/cross-platform-navigate";
import { open_login } from "@my-common-tool/tool/login-register";

export const CATEGORY_TYPE = {
  redirect: 1,
  app: 2,
  lobby: 3,
  deeplink: 4,
};

export const LAUNCH_TYPE = {
  redirect: 1,
};

export function getNavigateLaunchGameLink(code, game_code, category = "") {
  const isMobile = window.innerWidth < 768;
  const navigateLink = `/launch?${
    code ? `code=${encodeURIComponent(code)}&` : ``
  }${game_code ? `game=${encodeURIComponent(game_code)}&` : ``}${
    category ? `category=${encodeURIComponent(category)}&` : ``
  }isMobile=${isMobile ? "true" : "false"}&replace=true`;

  return navigateLink;
}

export function navigateToLaunchGamePage(code, game_code, category = "") {
  const link = getNavigateLaunchGameLink(code, game_code, category);
  openNewTabCrossPlatform(link);
}

const gotoLobby = async (resLaunch, code, customNavagate, category) => {
  const dataToSend = {
    gameList: resLaunch.launcher.gamelist,
    code,
    category,
  };
  await setNavigateData(dataToSend);

  if (customNavagate && typeof customNavagate === "function") {
    customNavagate(`/lobby`);
  } else {
    navigate(`/lobby`, {
      animate: false,
      reloadCurrent: false,
    });
  }
};

// ? openBeforeRedirectDialog is a function return Promise (true | false)

export default function useGameLaunch({
  customNavagate = null,
  isActiveTab = false,
  openBeforeRedirectDialog,
  customCssVars = {
    dialogApp: null,
    dialogGameStatistics: null,
  },
} = {}) {
  const { t } = useTranslation();
  const global = useRecoilValue(GlobalState);

  const {
    userInGameList,
    exitGameAndClearLocalUserInGame,
    addOptimisticUserInGame,
    fetchLatestUserInGame,
  } = useUserInGame(isActiveTab);

  const getLaunchResult = async (
    code,
    game_code,
    amount = "",
    needFetchGlobal = false,
    autoCloseLoading = true,
    skipLoadingOverlay = false,
  ) => {
    const isMobile = window.innerWidth < 768;
    const showOverlay = !skipLoadingOverlay;

    try {
      if (showOverlay) {
        open_loading();
      }
      const res = await launch({
        code: code,
        game: game_code,
        isMobile,
        // amount,
      });

      if (needFetchGlobal) {
        await fetchLatestUserInGame();
      }

      if (!res?.status) {
        if (autoCloseLoading && showOverlay) {
          close_loading();
        }
        show_toast(res?.message);
        return { status: res?.status, message: res?.message };
      } else {
        if (autoCloseLoading && showOverlay) {
          close_loading();
        }
      }

      return res;
    } catch (error) {
      if (autoCloseLoading && showOverlay) {
        close_loading();
      }
      show_toast("Error, can not launch game, please contact customer service");

      return null;
    }
  };

  const getGameStatisticsResult = async (
    code,
    game_code,
    autoCloseLoading = true,
  ) => {
    try {
      open_loading();
      const res = await get_game_statistics({ code: code, game: game_code });
      if (autoCloseLoading) {
        close_loading();
      }

      if (!res?.status) {
        show_toast(res?.message);
        return;
      }

      return res;
    } catch (error) {
      if (autoCloseLoading) {
        close_loading();
      }
      show_toast(
        "Error, can not get product detail, please contact customer service",
      );

      return null;
    }
  };

  const getSelectedProduct = ({
    code,
    game_code,
    gameItem,
    statisticsData,
  }) => {
    return {
      ...gameItem,
      ...statisticsData,
      disclaimer: statisticsData?.disclaimer
        ? statisticsData?.disclaimer?.trim()
        : "",
      launch_config: {
        code,
        game_code,
      },
    };
  };

  const { gotoAllGamePage } = useCasinoCatalogDataNew();
  /**
   *
   * @param {Object} propsObjOrCode
   * @param {string} [propsObjOrCode.code=""]
   * @param {string} [propsObjOrCode.game_code=""]
   * @param {string} [propsObjOrCode.type=""]
   * @param {Object} [propsObjOrCode.gameItem=null]
   * @param {string} [propsObjOrCode.category=""]
   */

  const normalizeLaunchProps = (propsObjOrCode, ...restProps) => {
    const old_props = ["code", "game_code", "type", "gameItem", "category"];

    if (restProps?.length > 0) {
      let obj = {};
      old_props.forEach((key, i) => {
        obj[key] = [propsObjOrCode, ...restProps][i];
      });

      return obj;
    }

    return typeof propsObjOrCode === "object" ? propsObjOrCode : {};
  };

  async function launch_game(propsObjOrCode, ...restProps) {
    const finalProps = normalizeLaunchProps(propsObjOrCode, ...restProps);

    const { code, game_code, type, gameItem, category } = finalProps;

    const isMobile = window.innerWidth < 768;
    let resConfirmStartGame = { status: false, data: null };
    let selectedProduct = {};

    if (String(CATEGORY_TYPE.lobby) === String(type)) {
      const skipGlobalLoaderForGamesPage =
        !!appConfig?.gameLaunch?.useAllGamePage;

      try {
        const resLuanch = await getLaunchResult(
          code,
          game_code,
          undefined,
          false,
          true,
          skipGlobalLoaderForGamesPage,
        );

        if (!resLuanch?.status) {
          return;
        }

        if (appConfig?.gameLaunch?.useAllGamePage) {
          const categoryList = global?.product_settings?.products;

          const categoryItem = (() => {
            if (!Array.isArray(categoryList)) return undefined;

            const byCategory = categoryList.find(
              (i) => String(i?.category) === String(category),
            );
            if (byCategory) return byCategory;

            if (!code) return undefined;

            return categoryList.find((cat) =>
              (cat?.products ?? []).some(
                (product) => String(product?.code) === String(code),
              ),
            );
          })();

          if (!categoryItem) {
            show_toast(
              t("Cannot find product please contact customer service"),
            );
            return;
          }

          await gotoAllGamePage(categoryItem, undefined, {
            preferredProviderCode: code,
          });
        } else {
          await gotoLobby(resLuanch, code, customNavagate, category);
        }
        return;
      } catch (error) {}
    } else {
      //? for other type , get game_statistics first
      try {
        const token = await loadToken();

        if (!token) {
          open_login();
          return;
        }

        if (!appConfig?.gameLaunch?.skipGameStatistics) {
          const resGameStatistics = await getGameStatisticsResult(
            code,
            game_code,
          );

          if (!resGameStatistics?.status) {
            return;
          }

          selectedProduct = getSelectedProduct({
            code,
            game_code,
            statisticsData: resGameStatistics?.data,
            gameItem,
          });

          resConfirmStartGame = await open_dialog_component(
            "",
            GameLaunchDialog,
            { selectedProduct },
            {
              cssClass: "launch-game-dialog",
              cssVars: {
                "--f7-dialog-width": "min(500px, 90vw)",
                "--f7-dialog-inner-padding": "24px 20px",
              },
              hideBackdrop: false,
              hideCancelButton: true,
              hideConfirmButton: true,
            },
          );

          if (!resConfirmStartGame?.status) {
            return;
          }
        }

        if (String(CATEGORY_TYPE.redirect) === String(type)) {
          if (appConfig?.gameLaunch?.beforeRedirectShowDialog) {
            const resStatus = await openBeforeRedirectDialog();

            if (!resStatus) {
              return;
            }
          }

          addOptimisticUserInGame({ code, game_code, category });
          navigateToLaunchGamePage(code, game_code, category);
        } else if (
          [String(CATEGORY_TYPE.app), String(CATEGORY_TYPE.deeplink)].includes(
            String(type),
          )
        ) {
          if (appConfig?.gameLaunch?.skipGameStatistics) {
            const resGameStatistics = await getGameStatisticsResult(
              code,
              game_code,
            );

            selectedProduct = getSelectedProduct({
              code,
              game_code,
              statisticsData: resGameStatistics?.data,
              gameItem,
            });
          }

          const resLuanch = await getLaunchResult(
            code,
            game_code,
            resConfirmStartGame?.amount,
            true,
          );

          if (appConfig?.gameLaunch?.skipGameStatistics) {
            close_loading();
          }

          if (!resLuanch?.status) {
            return;
          }

          const type = resLuanch?.type;
          const launcher = resLuanch?.launcher;
          const { android_url, ios_url, url, balance } = launcher;
          const launchMemberData = launcher?.member_account;

          const resConfirm = await open_dialog_component(
            "",
            DialogApp,
            {
              //? NEW
              type,
              gameStatistics: {
                rebate: selectedProduct?.rebate,
                today_stake: selectedProduct?.today_stake,
                yesterday_stake: selectedProduct?.yesterday_stake,
              },
              accountDetail: {
                account: launchMemberData?.username,
                password: launchMemberData?.password,

                balance: balance,

                android_url: android_url,
                ios_url: ios_url,
                deeplink_android: launchMemberData?.deeplink_android,
                deeplink_ios: launchMemberData?.deeplink_ios,
                url: url,
              },
              productDetail: {
                name: selectedProduct?.product,
                product_image: selectedProduct?.product_image,
              },
            },
            {
              cssClass: "dialog-app-dialog",
              hideCancelButton: true,
              hideConfirmButton: true,
              cancelName: t("Close"),
              confirmName: t("Start Game"),
              cssVars: {
                "--f7-dialog-width": "min(500px, 90vw)",
                "--f7-dialog-inner-padding": "24px 20px",
                ...customCssVars?.dialogApp,
              },

              hideBackdrop: false,
            },
          );
        }
        return;
      } catch (error) {}
    }
  }

  return {
    // run_exit_game,
    launch_game,
    getLaunchResult,
    userInGameList,
    // exitGameUsingGameItem: exitGame,
  };
}
