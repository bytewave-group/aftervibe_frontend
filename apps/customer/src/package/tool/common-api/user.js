import api from "../../../library/Axios";

const call_api = async (apiName, form) => {
  try {
    const resApi = await api.post(apiName, form);
    const res = resApi.data;
    return res;
  } catch (error) {
    return { status: false, message: "Internal Server Error" };
  }
};
