import { useSetRecoilState } from "recoil";
import api from "../library/Axios.jsx";
import api_file from "../library/AxiosMedia.jsx";
import AuthState from "../atoms/AuthState.jsx";
import {
  deleteToken,
  saveToken,
  saveUser,
} from "../components/action/preferences.jsx";
import { useTokenAndUser } from "../components/action/user-data.jsx";

/** Passed to verify_qr: VERIFIED_CHECKIN_QR, VERIFIED_CHECKOUT_QR, VERIFIED_ORDER_QR */
export const VERIFY_QR_TYPE = Object.freeze({
  CHECKIN: 1,
  CHECKOUT: 2,
  ORDER: 3,
  HAND_OVER: 4,
});

export default useAuthenticate;

function useAuthenticate() {
  const setAuth = useSetRecoilState(AuthState);
  const { token, user, amounts, isLoading, checkTokenChange } =
    useTokenAndUser();
  return {
    auth,
    login,
    global,
    flower_lists,
    staff_work_lists,
    buyout_lists,
    product_lists,
    ktv_packages_lists,
    ktv_rooms_lists,
    create_order_flower,
    create_order_buyout,
    ktv_session_lists,
    extend_order_ktv,
    floor_plan_lists,
    floor_plan_live,
    move_order_ktv,
    move_spot_ktv,
    end_order_ktv,
    floor_ws_ticket,
    create_order_ktv,
    create_order_product,
    report_orders,
    report_orders_commission,
    changeLanguage,
    checkIn,
    checkOut,
    getProfile,
    mc_lists,
    update_mc_status,
    penalty_lists,
    update_penalty,
    order_payment_method_list,
    update_order_payment_method,

    //hand over account
    payment_details,
    hand_over_account_list,
    update_hand_over_account,
    create_hand_over_account,
    rejected_orders,

    //order flower
    create_buy_flower_record_from_mummy,
    mummy_lists,
    flower_frequent_amounts,
    mummy_pending_payment_lists,
    update_flower_payment_method,

    //claim flower
    create_claim_flower_record_from_staff,

    //return flower
    create_return_flower_record_from_mummy,

    //accommodation
    staff_accommodation_lists,
    update_staff_accommodation,
    staff_lists,

    //device token
    sendDeviceToken,
    companyRules,
    uploadProfileImage,
    uploadMc,

    //flower movement
    flower_movement_lists,
    pending_flower_movement_lists,
    update_flower_movement_status,

    //order confirmation
    orderConfirmation,
    updateOrderConfirmation,

    //progress check-in settlement
    progress_checkin_settlement,
    getLeaderboard,
    create_checkin_settlement,
    checkin_list,
    generateQr,
    verify_qr,

    //service timeout
    service_timeout_lists,
    update_service_timeout,

    //call table service
    call_table_service,

    //retrieve order listing
    order_lists,

    //ticket list
    ticket_lists,
    update_ticket_status,

    //salary summary
    summary_salary,
  };

  async function login(form) {
    try {
      const res = await api.post("login", form);
      const data = res.data;
      if (!data.status) {
        return data;
      }

      await saveToken(data.data.token);
      await saveUser(data.data);
      await checkTokenChange();

      return data;
    } catch (error) {

      return { status: false, message: "Login failed" };
    }
  }

  async function auth() {
    try {
      if (token != null) {
        const res = await api.post("user");
        const data = res.data;

        if (!data.status) {
          await deleteToken();
          await checkTokenChange();
          return data;
        }

        await saveToken(data.token);
        await saveUser(data.data);
        await checkTokenChange();

        return data;
      } else {
        return { status: false, message: "Authentication failed" };
      }
    } catch (error) {
      return { status: false, message: "Authentication failed" };
    }
  }

  async function global(form = {}) {
    try {
      const res = await api.post("global", form);
      const data = res.data;
      if (!data.status) {
        return data;
      }

      return data;
    } catch (error) {
      return { status: false, message: "Failed while fetching global data" };
    }
  }

  async function flower_lists(form) {
    try {
      const res = await api.post("flower_lists", form);
      const data = res.data;
      if (!data.status) {
        return data;
      }

      return data;
    } catch (error) {
      return { status: false, message: "Invalid flower lists" };
    }
  }

  async function staff_work_lists(form) {
    try {
      const res = await api.post("staff_work_lists", form);
      const data = res.data;
      if (!data.status) {
        return data;
      }

      return data;
    } catch (error) {
      return { status: false, message: "Invalid staff work lists" };
    }
  }

  async function buyout_lists(form) {
    try {
      const res = await api.post("buyout_lists", form);
      const data = res.data;
      if (!data.status) {
        return data;
      }

      return data;
    } catch (error) {
      return { status: false, message: "Invalid buyout lists" };
    }
  }

  async function product_lists(form) {
    try {
      const res = await api.post("product_lists", form);
      const data = res.data;
      if (!data.status) {
        return data;
      }

      return data;
    } catch (error) {
      return { status: false, message: "Invalid product lists" };
    }
  }

  async function ktv_packages_lists(form) {
    try {
      const res = await api.post("ktv_packages_lists", form);
      const data = res.data;
      if (!data.status) {
        return data;
      }

      return data;
    } catch (error) {
      return { status: false, message: "Invalid ktv package lists" };
    }
  }

  async function ktv_rooms_lists(form) {
    try {
      const res = await api.post("ktv_rooms_lists", form);
      const data = res.data;
      if (!data.status) {
        return data;
      }

      return data;
    } catch (error) {
      return { status: false, message: "Invalid ktv room lists" };
    }
  }

  async function create_order_flower(form) {
    try {
      const res = await api.post("create_order_flower", form);
      const data = res.data;
      if (!data.status) {
        return data;
      }

      return data;
    } catch (error) {
      return { status: false, message: "Invalid create order flower" };
    }
  }

  async function create_order_buyout(form) {
    try {
      const res = await api.post("create_order_buyout", form);
      const data = res.data;
      if (!data.status) {
        return data;
      }

      return data;
    } catch (error) {
      return { status: false, message: "Invalid create order buyout" };
    }
  }


  async function ktv_session_lists(form = {}) {
    try {
      const res = await api.post("ktv_session_lists", form);
      const data = res.data;
      if (!data.status) {
        return data;
      }

      return data;
    } catch (error) {
      return { status: false, message: "Failed while fetching KTV sessions" };
    }
  }

  async function extend_order_ktv(form) {
    try {
      const res = await api.post("extend_order_ktv", form);
      const data = res.data;
      if (!data.status) {
        return data;
      }

      return data;
    } catch (error) {
      return { status: false, message: "Failed while extending KTV order" };
    }
  }

  // Floor plan (live KTV sessions)
  async function floor_plan_lists(form = {}) {
    try {
      const res = await api.post("floor_plan_lists", form);
      return res.data;
    } catch (error) {
      return { status: false, message: "Failed while fetching floor plans" };
    }
  }

  async function floor_plan_live(form = {}) {
    try {
      const res = await api.post("floor_plan_live", form);
      return res.data;
    } catch (error) {
      return { status: false, message: "Failed while fetching live floor plan" };
    }
  }

  async function move_order_ktv(form = {}) {
    try {
      const res = await api.post("move_order_ktv", form);
      return res.data;
    } catch (error) {
      return { status: false, message: "Failed while moving KTV session" };
    }
  }

  async function move_spot_ktv(form = {}) {
    try {
      const res = await api.post("move_spot_ktv", form);
      return res.data;
    } catch (error) {
      return { status: false, message: "Failed while moving KTV sessions" };
    }
  }

  async function end_order_ktv(form = {}) {
    try {
      const res = await api.post("end_order_ktv", form);
      return res.data;
    } catch (error) {
      return { status: false, message: "Failed while ending KTV session" };
    }
  }

  async function floor_ws_ticket(form = {}) {
    try {
      const res = await api.post("floor_ws_ticket", form);
      return res.data;
    } catch (error) {
      return { status: false, message: "Failed while connecting to live updates" };
    }
  }

  async function create_order_ktv(form) {
    try {
      const res = await api.post("create_order_ktv", form);
      const data = res.data;
      if (!data.status) {
        return data;
      }

      return data;
    } catch (error) {
      return { status: false, message: "Invalid create order ktv" };
    }
  }

  async function create_order_product(form) {
    try {
      const res = await api.post("create_order_product", form);
      const data = res.data;
      if (!data.status) {
        return data;
      }

      return data;
    } catch (error) {
      return { status: false, message: "Invalid create order product" };
    }
  }

  async function report_orders(form) {
    try {
      const res = await api.post("report_orders", form);
      const data = res.data;
      if (!data.status) {
        return data;
      }

      return data;
    } catch (error) {
      return { status: false, message: "Invalid report orders" };
    }
  }

  async function report_orders_commission(form) {
    try {
      const res = await api.post("report_orders_commission", form);
      const data = res.data;
      if (!data.status) {
        return data;
      }

      return data;
    } catch (error) {
      return { status: false, message: "Invalid report order commission" };
    }
  }

  async function changeLanguage(form) {
    try {
      const res = await api.post("change_language", form);
      const data = res.data;
      if (!data.status) {
        return data;
      }

      return data;
    } catch (error) {
      return { status: false, message: "Failed while changing language" };
    }
  }

  async function checkIn(form) {
    try {
      const res = await api.post("check_in", form);
      const data = res.data;
      if (!data.status) {
        return data;
      }

      return data;
    } catch (error) {
      return { status: false, message: "Failed while check in" };
    }
  }

  async function checkOut(form) {
    try {
      const res = await api.post("check_out", form);
      const data = res.data;
      if (!data.status) {
        return data;
      }

      return data;
    } catch (error) {
      return { status: false, message: "Failed while check out" };
    }
  }

  async function getProfile(form) {
    try {
      const res = await api.post("profile", form);
      const data = res.data;
      if (!data.status) {
        return data;
      }

      return data;
    } catch (error) {
      return { status: false, message: "Failed while check in" };
    }
  }

  async function mc_lists(form) {
    try {
      const res = await api.post("mc_lists", form);
      const data = res.data;
      if (!data.status) {
        return data;
      }

      return data;
    } catch (error) {
      return { status: false, message: "Failed while fetching mc lists" };
    }
  }

  async function update_mc_status(form) {
    try {
      const res = await api.post("update_mc_status", form);
      const data = res.data;
      if (!data.status) {
        return data;
      }

      return data;
    } catch (error) {
      return { status: false, message: "Failed while updating mc status" };
    }
  }

  async function penalty_lists(form) {
    try {
      const res = await api.post("penalty_lists", form);
      const data = res.data;
      if (!data.status) {
        return data;
      }

      return data;
    } catch (error) {
      return { status: false, message: "Failed while fetching penalty lists" };
    }
  }

  async function update_penalty(form) {
    try {
      const res = await api.post("update_penalty", form);
      const data = res.data;
      if (!data.status) {
        return data;
      }

      return data;
    } catch (error) {
      return { status: false, message: "Failed while updating penalty" };
    }
  }

  async function order_payment_method_list(form) {
    try {
      const res = await api.post("order_payment_method_list", form);
      const data = res.data;
      if (!data.status) {
        return data;
      }

      return data;
    } catch (error) {
      return { status: false, message: "Failed while fetching order payment method list" };
    }
  }

  async function update_order_payment_method(form) {
    try {
      const res = await api.post("update_order_payment_method", form);
      const data = res.data;
      if (!data.status) {
        return data;
      }

      return data;
    } catch (error) {
      return { status: false, message: "Failed while updating order payment method" };
    }
  }

  async function payment_details(form) {
    try {
      const res = await api.post("payment_details", form);
      const data = res.data;
      if (!data.status) {
        return data;
      }
      return data;
    } catch (error) {
      return { status: false, message: "Failed while fetching hand over account list" };
    }
  }

  async function hand_over_account_list(form) {
    try {
      const res = await api.post("hand_over_account_list", form);
      const data = res.data;
      if (!data.status) {
        return data;
      }

      return data;
    } catch (error) {
      return { status: false, message: "Failed while fetching payment details" };
    }
  }

  async function update_hand_over_account(form) {
    try {
      const res = await api.post("update_hand_over_account", form);
      const data = res.data;
      if (!data.status) {
        return data;
      }

      return data;
    } catch (error) {
      return { status: false, message: "Failed while updating hand over account" };
    }
  }

  async function create_hand_over_account(form) {
    try {
      const res = await api.post("create_hand_over_account", form);
      const data = res.data;
      if (!data.status) {
        return data;
      }

      return data;
    } catch (error) {
      return { status: false, message: "Failed while creating hand over account" };
    }
  }

  async function rejected_orders(form) {
    try {
      const res = await api.post("rejected_orders", form);
      const data = res.data;
      if (!data.status) {
        return data;
      }

      return data;
    } catch (error) {
      return { status: false, message: "Failed while fetching rejected orders" };
    }
  }

  async function create_buy_flower_record_from_mummy(form) {
    try {
      const res = await api.post("create_buy_flower_record_from_mummy", form);
      const data = res.data;
      if (!data.status) {
        return data;
      }

      return data;
    } catch (error) {
      return { status: false, message: "Failed while creating buy flower record from mummy" };
    }
  }

  async function mummy_lists(form) {
    try {
      const res = await api.post("mummy_lists", form);
      const data = res.data;
      if (!data.status) {
        return data;
      }

      return data;
    } catch (error) {
      return { status: false, message: "Failed while fetching mummy lists" };
    }
  }

  /** Most used claim-flower amounts (RM) for quick-pick buttons; never throws. */
  async function flower_frequent_amounts(form) {
    try {
      const res = await api.post("flower_frequent_amounts", form);
      return res.data;
    } catch (error) {
      return { status: false, message: "Failed while fetching frequent flower amounts", data: [] };
    }
  }

  async function create_claim_flower_record_from_staff(form) {
    try {
      const res = await api.post("create_claim_flower_record_from_staff", form);
      const data = res.data;
      if (!data.status) {
        return data;
      }

      return data;
    } catch (error) {
      return { status: false, message: "Failed while creating claim flower record from staff" };
    }
  }

  async function create_return_flower_record_from_mummy(form) {
    try {
      const res = await api.post("create_return_flower_record_from_mummy", form);
      const data = res.data;
      if (!data.status) {
        return data;
      }

      return data;
    } catch (error) {
      return { status: false, message: "Failed while creating return flower record from mummy" };
    }
  }

  async function mummy_pending_payment_lists(form) {
    try {
      const res = await api.post("mummy_pending_payment_lists", form);
      const data = res.data;
      if (!data.status) {
        return data;
      }

      return data;
    } catch (error) {
      return { status: false, message: "Failed while fetching mummy pending payment lists" };
    }
  }

  async function update_flower_payment_method(form) {
    try {
      const res = await api.post("update_flower_payment_method", form);
      const data = res.data;
      if (!data.status) {
        return data;
      }

      return data;
    } catch (error) {
      return { status: false, message: "Failed while updating flower payment method" };
    }
  }

  async function staff_accommodation_lists(form) {
    try {
      const res = await api.post("staff_accommodation_lists", form);
      const data = res.data;
      if (!data.status) {
        return data;
      }

      return data;
    } catch (error) {
      return { status: false, message: "Failed while fetching staff accommodation lists" };
    }
  }

  async function update_staff_accommodation(form) {
    try {
      const res = await api.post("update_staff_accommodation", form);
      const data = res.data;
      if (!data.status) {
        return data;
      }

      return data;
    } catch (error) {
      return { status: false, message: "Failed while updating staff accommodation" };
    }
  }

  async function staff_lists(form) {
    try {
      const res = await api.post("staff_lists", form);
      const data = res.data;
      if (!data.status) {
        return data;
      }

      return data;
    } catch (error) {
      return { status: false, message: "Failed while fetching staff lists" };
    }
  }

  async function sendDeviceToken(form) {
    try {
      const res = await api.post("add_device_token", form);
      const data = res.data;
      if (!data.status) {
        return data;
      }

      return data;
    } catch (error) {
      return { status: false, message: "Failed while sending device token" };
    }
  }

  async function companyRules(form) {
    try {
      const res = await api.post("company_rules", form);
      const data = res.data;
      if (!data.status) {
        return data;
      }

      return data;
    } catch (error) {
      return { status: false, message: "Failed while fetching company rules" };
    }
  }

  async function uploadProfileImage(formData) {
    try {
      const res = await api_file.post("upload_profile_image", formData);
      const data = res.data;
      if (!data.status) {
        return data;
      }

      return data;
    } catch (error) {
      return { status: false, message: "Failed while uploading profile image" };
    }
  }

  async function uploadMc(form) {
    try {
      const res = await api_file.post("upload_mc", form);
      const data = res.data;
      if (!data.status) {
        return data;
      }

      return data;
    } catch (error) {
      return { status: false, message: "Failed while upload MC" };
    }
  }

  async function flower_movement_lists(form) {
    try {
      const res = await api.post("flower_movement_lists", form);
      const data = res.data;
      if (!data.status) {
        return data;
      }

      return data;
    } catch (error) {
      return { status: false, message: "Failed while fetching flower movement lists" };
    }
  }

  async function pending_flower_movement_lists(form) {
    try {
      const res = await api.post("pending_flower_movement_lists", form);
      const data = res.data;
      if (!data.status) {
        return data;
      }

      return data;
    } catch (error) {
      return { status: false, message: "Failed while fetching pending flower movement lists" };
    }
  }

  async function update_flower_movement_status(form) {
    try {
      const res = await api.post("update_flower_movement_status", form);
      const data = res.data;
      if (!data.status) {
        return data;
      }

      return data;
    } catch (error) {
      return { status: false, message: "Failed while updating flower movement status" };
    }
  }

  async function orderConfirmation(form) {
    try {
      const res = await api.post("order_confirmation_list", form);
      const data = res.data;
      if (!data.status) {
        return data;
      }

      return data;
    } catch (error) {
      return { status: false, message: "Failed while fetching order confirmation" };
    }
  }

  async function updateOrderConfirmation(form) {
    try {
      const res = await api.post("update_order_confirmation", form);
      const data = res.data;
      if (!data.status) {
        return data;
      }

      return data;
    } catch (error) {
      return { status: false, message: "Failed while updating order confirmation" };
    }
  }

  async function progress_checkin_settlement(form) {
    try {
      const res = await api.post("progress_checkin_settlement", form);
      const data = res.data;
      if (!data.status) {
        return data;
      }

      return data;
    } catch (error) {
      return { status: false, message: "Failed while fetching progress check-in settlement" };
    }
  }

  async function getLeaderboard(form) {
    try {
      const res = await api.post("leaderboard", form);
      const data = res.data;
      if (!data.status) {
        return data;
      }

      return data;
    } catch (error) {
      return { status: false, message: "Failed while fetching leaderboard" };
    }
  }

  async function create_checkin_settlement(form) {
    try {
      const res = await api.post("create_checkin_settlement", form);
      const data = res.data;
      if (!data.status) {
        return data;
      }

      return data;
    } catch (error) {
      return { status: false, message: "Failed while creating check-in settlement" };
    }
  }

  async function checkin_list(form) {
    try {
      const res = await api.post("checkin_lists", form);
      const data = res.data;
      if (!data.status) {
        return data;
      }

      return data;
    } catch (error) {
      return { status: false, message: "Failed while fetching check-in list" };
    }
  }

  async function generateQr(form) {
    try {
      const res = await api.post("generate_qr", form);
      const data = res.data;
      if (!data.status) {
        return data;
      }

      return data;
    } catch (error) {
      return { status: false, message: "Failed while generating QR" };
    }
  }

  async function verify_qr(form) {
    try {
      const res = await api.post("verify_qr", form);
      const data = res.data;
      if (!data.status) {
        return data;
      }

      return data;
    } catch (error) {
      return { status: false, message: "Failed while verifying QR" };
    }
  }

  async function service_timeout_lists(form) {
    try {
      const res = await api.post("order_endtime_notification_list", form);
      const data = res.data;
      if (!data.status) {
        return data;
      }

      return data;
    } catch (error) {
      return { status: false, message: "Failed while fetching service timeout lists" };
    }
  }

  async function update_service_timeout(form) {
    try {
      const res = await api.post("update_order_endtime_notification_sent", form);
      const data = res.data;
      if (!data.status) {
        return data;
      }

      return data;
    } catch (error) {
      return { status: false, message: "Failed while updating service timeout" };
    }
  }

  async function call_table_service(form) {
    try {
      const res = await api.post("call_table_service", form);
      const data = res.data;
      if (!data.status) {
        return data;
      }

      return data;
    } catch (error) {
      return { status: false, message: "Failed while updating service timeout" };
    }
  }

  async function order_lists(form) {
    try {
      const res = await api.post("order_lists", form);
      const data = res.data;
      if (!data.status) {
        return data;
      }

      return data;
    } catch (error) {
      return { status: false, message: "Failed while fetching order lists" };
    }
  }

  async function ticket_lists(form) {
    try {
      const res = await api.post("ticket_lists", form);
      const data = res.data;
      if (!data.status) {
        return data;
      }

      return data;
    } catch (error) {
      return { status: false, message: "Failed while fetching ticket lists" };
    }
  }

  async function update_ticket_status(form) {
    try {
      const res = await api.post("update_ticket_status", form);
      const data = res.data;
      if (!data.status) {
        return data;
      }

      return data;
    } catch (error) {
      return { status: false, message: "Failed while updating ticket status" };
    }
  }

  async function summary_salary(form) {
    try {
      const res = await api.post("summary_salary", form);
      const data = res.data;
      if (!data.status) {
        return data;
      }

      return data;
    } catch (error) {
      return { status: false, message: "Failed while fetching salary summary" };
    }
  }
}
