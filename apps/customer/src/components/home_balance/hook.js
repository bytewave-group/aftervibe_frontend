import { useCallback, useMemo } from "react";
import { useTokenAndUser } from "../action/user-data";
import { useRecoilValue } from "recoil";
import GlobalState from "../../atoms/GlobalState";
import { useTranslation } from "react-i18next";
import useCommon from "../action/Common";
import useAuthenticate from "../../actions/Authenticate";

import { navigate } from "@my-common-tool/tool/navigate";
import {
  open_confirm_message,
  open_message,
} from "@my-common-tool/tool/dialog";
import { close_loading, open_loading } from "@my-common-tool/tool/loading";
import { formatAmount } from "@my-common-tool/tool/common";
import { open_login } from "@my-common-tool/tool/login-register";
import {
  isForceShowingHiddenContent,
  isTestingCurrency,
  isTestingDisplayCss,
  TESTING_MAP,
} from "./testing_constant";
//? ======================================================================
//? ======================================================================
const AUTH_REQUIRED = new Set(["/deposit", "/withdraw"]);
//? ======================================================================

const useDisplayCss = () => {
  const global = useRecoilValue(GlobalState);

  const displayCss = useMemo(() => {
    if (TESTING_MAP[isTestingDisplayCss]) {
      return TESTING_MAP[isTestingDisplayCss];
    }

    return global?.display;
  }, [global?.display]);

  return { displayCss };
};

const useAccountDisplay = ({ pattern = 1 } = {}) => {
  const { t } = useTranslation();
  const global = useRecoilValue(GlobalState);
  const { user } = useTokenAndUser();

  const { displayCss } = useDisplayCss();

  const pattern2ExtraInfo = useMemo(() => {
    return pattern === 2
      ? [
          {
            label: t("Deposit Time"),
            injectCss: {
              "--home-balance-info-deposit-time-text-color":
                displayCss?.balance?.balance_deposit_time_color,
              "--home-balance-info-value-deposit-time-text-color":
                displayCss?.balance?.balance_deposit_time_value_color,
            },
            labelClassName: "text-home-balance-info-deposit-time",
            valueClassName: "text-home-balance-info-value-deposit-time",

            hideCurrency: true,
            //TODO: check
            value: global?.balance_section_settings?.deposit_time_text,
          },
        ]
      : [];
  }, [
    global?.balance_section_settings?.deposit_time_text,
    displayCss,
    pattern,
    t,
  ]);

  const pattern1ExtraInfo = useMemo(() => {
    if (
      !(
        isForceShowingHiddenContent ||
        (pattern === 1 && user?.bonus_target?.config_withdraw?.max_value > 0)
      )
    ) {
      return [];
    }

    return [
      {
        label: t("Maximum Withdrawal"),
        injectCss: {
          "--home-balance-info-maximum-withdraw-text-color":
            displayCss?.balance?.balance_maximum_withdraw_color || "#fff",

          "--home-balance-info-value-maximum-withdraw-text-color":
            displayCss?.balance?.balance_maximum_withdraw_value_color || "#fff",
        },
        labelClassName: "text-home-balance-info-maximum-withdraw",
        valueClassName: "text-home-balance-info-value-maximum-withdraw",

        value: formatAmount(user?.bonus_target?.config_withdraw?.max_value),
      },
    ];
  }, [pattern, user?.bonus_target?.config_withdraw?.max_value, displayCss, t]);

  const withdrawalInfo = useMemo(
    () => [
      {
        label: t("Minimum Deposit"),
        pattern2_label: t("Min Deposit"),
        injectCss: {
          "--home-balance-info-minimum-deposit-text-color":
            displayCss?.balance?.balance_minimum_deposit_color,
          "--home-balance-info-value-minimum-deposit-text-color":
            displayCss?.balance?.balance_minimum_deposit_value_color,
        },
        labelClassName: "text-home-balance-info-minimum-deposit",
        valueClassName: "text-home-balance-info-value-minimum-deposit",
        value: formatAmount(global?.payment_settings?.min_deposit),
      },
      {
        label: t("Minimum "),
        pattern2_label: t("Min Withdrawal"),
        injectCss: {
          "--home-balance-info-minimum-withdraw-text-color":
            displayCss?.balance?.balance_minimum_withdraw_color,
          "--home-balance-info-value-minimum-withdraw-text-color":
            displayCss?.balance?.balance_minimum_withdraw_value_color,
        },
        labelClassName: "text-home-balance-info-minimum-withdraw",
        valueClassName: "text-home-balance-info-value-minimum-withdraw",
        value: formatAmount(
          user?.bonus_target?.config_withdraw?.min_value
            ? Math.max(
                user?.bonus_target?.config_withdraw?.min_value,
                global?.payment_settings?.min_withdrawal,
              )
            : global?.payment_settings?.min_withdrawal,
        ),
      },

      ...pattern1ExtraInfo,
      ...pattern2ExtraInfo,
    ],
    [displayCss, global?.payment_settings, user?.bonus_target, t],
  );

  const userDetail = useMemo(
    () => ({
      username: user?.username || "",
      banks: user?.banks || [],
      balance: user?.balance || null,
      turnover: global?.member_bonus?.turnover ?? "",
      remaining_turnover: global?.member_bonus?.remaining_turnover ?? "",
      status: global?.member_bonus?.status ?? "Null",
    }),
    [user, global?.member_bonus],
  );

  const pattern2SpecialInfo = useMemo(() => {
    return [
      ...(isForceShowingHiddenContent ||
      user?.bonus_target?.config_withdraw?.max_value > 0
        ? [
            {
              label: t("Maximum Withdrawal"),
              injectCss: {
                "--home-balance-info-maximum-withdraw-text-color":
                  displayCss?.balance?.balance_maximum_withdraw_color || "#fff",
                "--home-balance-info-value-maximum-withdraw-text-color":
                  displayCss?.balance?.balance_maximum_withdraw_value_color ||
                  "#fff",
              },
              labelClassName: "text-home-balance-info-maximum-withdraw",
              valueClassName: "text-home-balance-info-value-maximum-withdraw",
              value: formatAmount(
                user?.bonus_target?.config_withdraw?.max_value,
              ),
            },
          ]
        : []),
    ];
  }, [displayCss?.balance, user?.bonus_target]);

  return { userDetail, withdrawalInfo, pattern2SpecialInfo };
};

const useAccountAction = () => {
  const { t } = useTranslation();
  const global = useRecoilValue(GlobalState);
  const { user, isLoading, token } = useTokenAndUser();

  const { refresh_user } = useCommon();
  const { clear_balance } = useAuthenticate();
  //? ==============================================================================

  const clearBalance = useCallback(async () => {
    const resConfirm = await open_confirm_message(
      t("Sure to Clear Balance?"),
      t("Your balance will reset to {{currency}} 0.00", {
        currency: isTestingCurrency ? "XXX" : global?.settings?.currency,
      }),
    );

    if (!resConfirm?.status) return;

    try {
      open_loading();
      const res = await clear_balance();
      close_loading();
      if (res?.status) {
        open_message(res?.message, "", "success");
        setTimeout(() => {
          window.location?.reload();
        }, 600);
      } else {
        open_message(res?.message, "", "error");
      }
    } catch (error) {
      close_loading();
      open_message("Error , Please contact customer service", "", "error");
    }
  }, [t, global?.settings?.currency]);

  const handleNavigate = useCallback(
    async (path) => {
      if (AUTH_REQUIRED?.has(path)) {
        if (token && global.theme !== "blank") {
          navigate(path);
        } else {
          open_login();
        }
      } else {
        navigate(path);
      }
    },
    [token, global?.theme],
  );

  const WITHDRAW_RULES = useMemo(
    () => [
      {
        type: "turnover",
        check: (user) => {
          const numTarget = parseFloat(user?.bonus_target?.target);
          const validTarget = isNaN(numTarget) ? 0 : numTarget;

          const numRemainingTarget = parseFloat(
            user?.bonus_target?.remaining_target,
          );
          const validRemainingTarget = isNaN(numRemainingTarget)
            ? 0
            : numRemainingTarget;

          return (
            user?.bonus_target?.type === "turnover" &&
            validRemainingTarget < validTarget
          );
        },
        getMessage: (user) =>
          t("You have remaining turnover of {{diff}}", {
            diff:
              (user?.bonus_target?.target ?? 0) -
              (user?.bonus_target?.remaining_target ?? 0),
          }),
      },
      {
        type: "winover",
        check: (user) => {
          const numTarget = parseFloat(user?.bonus_target?.target);
          const validTarget = isNaN(numTarget) ? 0 : numTarget;

          const numRemainingTarget = parseFloat(
            user?.bonus_target?.remaining_target,
          );
          const validRemainingTarget = isNaN(numRemainingTarget)
            ? 0
            : numRemainingTarget;

          return (
            user?.bonus_target?.type === "winover" &&
            validRemainingTarget < validTarget
          );
        },
        getMessage: (user) =>
          t("You have remaining winover of {{diff}}", {
            diff:
              (user?.bonus_target?.target ?? 0) -
              (user?.bonus_target?.remaining_target ?? 0),
          }),
      },
      {
        type: "balance_check",
        check: (user) =>
          user?.balance < global?.payment_settings?.min_withdrawal,
        getMessage: (user) =>
          t("Minimum withdrawal is {{currency}} {{amount}}", {
            currency:
              (user?.currency ?? isTestingCurrency)
                ? "XXX"
                : (global?.settings?.currency ?? ""),
            amount: global?.payment_settings?.min_withdrawal ?? 0,
          }),
      },
    ],
    [
      user?.bonus_target,
      user?.balance,
      user?.min_withdrawal,
      user?.currency,
      t,
      global?.settings?.currency,
      global?.payment_settings?.min_withdrawal,
    ],
  );

  const handleRefresh = useCallback(async () => {
    if (!user && !isLoading) {
      open_login();
      return;
    }

    open_loading();
    try {
      await refresh_user();
      close_loading();
    } catch (error) {
      close_loading();
    }
  }, [user, isLoading]);

  const handleWithdraw = useCallback(() => {
    const failedRule = WITHDRAW_RULES.find((rule) => rule.check(user));

    if (failedRule) {
      open_message(t("Notice"), failedRule.getMessage(user));

      return;
    }

    handleNavigate("/withdraw");
  }, [WITHDRAW_RULES, user, t, handleNavigate]);

  return {
    clearBalance,
    handleRefresh,
    handleWithdraw,
    handleNavigate,
  };
};

export { useDisplayCss, useAccountDisplay, useAccountAction };
