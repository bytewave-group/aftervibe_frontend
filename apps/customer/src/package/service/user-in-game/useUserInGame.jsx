import { useEffect, useRef, useCallback } from "react";
import { useRecoilState, useRecoilValue } from "recoil";
import { useTranslation } from "react-i18next";
import { v4 as uuidv4 } from "uuid";

import UserInGameState from "./UserInGameState";
import {
  getUserInGameDetail,
  setUserInGameDetail,
} from "@my-common-tool/tool/preferences";
import { useTabChannelMessage } from "@my-common-tool/tool/tab-channel-message";
import { exit_game, useGlobal } from "@my-common-tool/tool/api";

//TODO : replace after
import GlobalState from "../../../atoms/GlobalState";
import { useTokenAndUser } from "../../../components/action/user-data";
import { fetchAndUpdateGlobal } from "@my-common-tool/tool/api";

import { arraysHaveSameItemsByCode, dedupeUserInGame } from "./utils";

export default function useUserInGame(isActiveTab = false) {
  const { t } = useTranslation();

  const global = useRecoilValue(GlobalState);
  const [userInGameState, setUserInGameState] = useRecoilState(UserInGameState);
  const { list: userInGameList } = userInGameState;
  const { token } = useTokenAndUser();

  const TAB_ID = useRef(uuidv4());
  const { send, subscribe } = useTabChannelMessage("launch_game_channel");

  const getLocalUserInGameList = useCallback(async () => {
    const local = await getUserInGameDetail();
    return Array.isArray(local) ? local : [];
  }, []);

  const fetchLatestGlobalUserInGame = useCallback(async () => {
    const resGlobal = await fetchAndUpdateGlobal();
    return Array.isArray(resGlobal?.member?.binded_product)
      ? resGlobal.member.binded_product
      : [];
  }, []);

  const syncUserInGame = useCallback(async (newList) => {
    // console.log("Sync recoilState");
    setUserInGameState((prev) => ({
      list: newList,
    }));

    const localList = await getLocalUserInGameList();
    if (!arraysHaveSameItemsByCode(newList, localList)) {
      // console.log("Sync capacitor Preference");
      await setUserInGameDetail(newList);
    } else {
      // console.log("is SAME, SKIP Sync capacitor Preference");
    }
  }, []);

  //? ========================================================================== */
  async function addOptimisticUserInGame({
    code = "",
    game = "",
    category = "",
  }) {
    const optimisticLocal = userInGameList;
    const optimisticFinalLocal = dedupeUserInGame([
      ...optimisticLocal,
      { code, game, category },
    ]);

    await syncUserInGame(optimisticFinalLocal);
  }

  //? Add User In Game
  const fetchGlobalAndSyncUserInGame = useCallback(async () => {
    const newUserInGameCodeGlobal = await fetchLatestGlobalUserInGame();
    await syncUserInGame(newUserInGameCodeGlobal);
  }, [fetchLatestGlobalUserInGame, syncUserInGame]);

  //? ========================================================================== */
  //? add listenner to trigger fetchGlobalAndSync
  useEffect(() => {
    const unsubscribe = subscribe("TRIGGER_FETCH_GLOBAL", async (_, msg) => {
      if (msg.tabId === TAB_ID.current) return;

      if (!isActiveTab) return;
      await fetchGlobalAndSyncUserInGame();
    });

    return () => {
      unsubscribe();
    };
  }, [subscribe, fetchGlobalAndSyncUserInGame]);
  //? ========================================================================== */
  //?
  async function fetchLatestUserInGame() {
    send({
      id: uuidv4(),
      type: "TRIGGER_FETCH_GLOBAL",
      tabId: TAB_ID.current,
      data: null,
    });

    await fetchGlobalAndSyncUserInGame();
  }
  return {
    userInGameList,
    // exitGameAndClearLocalUserInGame,
    addOptimisticUserInGame,
    fetchLatestUserInGame,
  };
}
