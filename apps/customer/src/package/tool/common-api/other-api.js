//TODO: after
import api from "../../../library/Axios.jsx";

export const call_api = async (apiName, form) => {
  try {
    const resApi = await api.post(apiName, form);
    const res = resApi.data;
    return res;
  } catch (error) {
    return { status: false, message: "Internal Server Error" };
  }
};

export function launch(form) {
  return call_api("launch", form);
}

export function get_game_statistics(form) {
  return call_api("get_game_statistics", form);
}

export function exit_game(form) {
  return call_api("exit_game", form);
}

export function add_device_token(form) {
  return call_api("add_device_token", form);
}

export function deposit_get_bank_info(form) {
  return call_api("deposit_get_bank_info", form);
}
