import { useRecoilState } from "recoil";
import { isEqual } from "lodash";
import { show_toast } from "@my-common-tool/tool/toast";
//TODO: after
import GlobalState from "../../../atoms/GlobalState.jsx";
import api from "../../../library/Axios.jsx";
import { setRecoil } from "recoil-nexus";

export default useGlobal;

function useGlobal() {
  const [global, setGlobal] = useRecoilState(GlobalState);

  return {
    fetch,
    fetchOnly,
    game_lists,
  };

  async function fetch(form) {
    try {
      const { data } = await api.post("global", form, {
        isRequiredUniqueKey: true,
      });

      const theme = data?.theme || "THEME";

      const newGlobal = { ...data, theme };

      setGlobal((prev) => {
        if (isEqual(prev, newGlobal)) {
          return prev;
        }
        return newGlobal;
      });

      return newGlobal;
    } catch (error) {}
  }

  async function fetchOnly(form) {
    return api
      .post("global", form)
      .then((res) => {
        return res.data;
      })
      .then((res) => {
        const res2 = { ...res, theme: res?.theme || "THEME" };
        return res2;
      });
  }

  async function game_lists(form) {
    return api
      .post("game_lists", form)
      .then((res) => res.data)
      .then((res) => {
        return res;
      });
  }
}

export async function fetchAndUpdateGlobal(form) {
  try {
    const resApi = await api.post("global", form);
    const glo = resApi.data;

    const theme = glo?.theme || "THEME";
    const newGlobal = { ...glo, theme };

    setRecoil(GlobalState, (prev) => {
      if (isEqual(prev, newGlobal)) {
        return prev;
      }
      return newGlobal;
    });

    return newGlobal;
  } catch (error) {
    return { status: false, message: "Internal Server Error" };
  }
}
