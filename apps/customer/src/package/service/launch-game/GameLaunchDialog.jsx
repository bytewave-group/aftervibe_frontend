import React, { useState, useEffect, useRef, useMemo } from "react";
import { useRecoilValue } from "recoil";
import { useTranslation } from "react-i18next";

import { useMediaQuery } from "react-responsive";
import { Button } from "framework7-react";
import { navigate } from "@my-common-tool/tool/navigate";
import { show_toast } from "@my-common-tool/tool/toast";
import { formatAmount } from "@my-common-tool/tool/common";

import GlobalState from "../../../atoms/GlobalState";
import appConfig from "../../../../appconfig.json";

const formatTurnoverDisplay = (amount, currency) => {
  const num = Number(amount);
  if (isNaN(num)) return "--";
  return `${num > 0 ? "+" : num < 0 ? "-" : ""}${currency} ${Math.abs(num)}`;
};

export default function GameLaunchDialog({
  selectedProduct = {
    name: "",
    rebate: "--",
    yesterday_stake: "--",
    today_stake: "--",
    balance: "--",
    balance_in_game: "--",
  },
  onf7DialogConfirm,
} = {}) {
  const { t } = useTranslation();
  const global = useRecoilValue(GlobalState);

  const productDetail = selectedProduct;

  const walletName = useMemo(() => {
    if (productDetail?.wallet === "game_wallet") return "Game Wallet";
  }, [productDetail?.wallet]);

  const walletBalance = useMemo(() => {
    return productDetail?.balance ?? 0;
  }, [productDetail]);

  const formattedWalletAmount = useMemo(
    () => formatAmount(walletBalance),
    [walletBalance],
  );

  const walletBalanceInGame = useMemo(() => {
    return productDetail?.balance_in_game ?? 0;
  }, [productDetail]);

  const formattedWalletAmountInGame = useMemo(
    () => formatAmount(walletBalanceInGame),
    [walletBalanceInGame],
  );

  const currency = global?.settings?.currency;

  const isPC = useMediaQuery({ minWidth: 768 });

  const [form, setForm] = useState({
    amount: 0,
    argee: false,
  });

  useEffect(() => {
    const num = parseFloat(productDetail?.balance);
    const validNum = isNaN(num) ? 0 : num;
    setForm((prev) => ({
      ...prev,
      amount: validNum,
    }));
  }, [productDetail]);

  const handleTopUp = () => {
    navigate("/deposit");
    onf7DialogConfirm(false, { data: null });
  };

  const handleAgreementCheck = () => {
    setForm((prevForm) => ({ ...prevForm, argee: !prevForm?.argee }));
  };

  const handleStartGame = () => {
    if (!productDetail?.launch_config?.code) {
      show_toast(t("Missing game information"));
      return;
    }

    if (!form?.argee && !!productDetail?.disclaimer) {
      show_toast(t("Please agree to the User agreement"));
      return;
    }

    onf7DialogConfirm(true, { ...form });
  };

  return (
    <div className="d-flex-column bg-game-launch-dialog-background text-theme-text game-launch-dialog-inner">
      <div
        style={{
          maxHeight: "60vh",
          padding: "var(--custom-dialog-inner-padding)",
        }}
        className="d-flex-column overflow-auto"
      >
        {!appConfig?.gameLaunch?.hideProductImg && (
          <div className="col-6 mx-auto">
            <img
              className="w-100 rounded-2"
              src={productDetail?.product_image}
            />
          </div>
        )}
        <div className="w-100 text-center mt-12 mb-3">
          <span className="text24 text-md36 fwNoweight-bold text-game-launch-dialog-title">
            {productDetail?.product || "-"}
          </span>
        </div>

        <div className="d-flex flex-column align-items-center position-relative w-100  mt-md-2">
          <div
            className="position-relative mx-md-auto px-0 w-100"
            style={{
              maxWidth: "800px",
            }}
          >
            {/* --- Bring Amount Section --- */}
            <div className="">
              {/* --- Game Wallet Balance --- */}
              {productDetail?.disclaimer && (
                <>
                  <div
                    className="d-flex-column align-items-center border-2 border-gradient-border-game-launch-dialog-statistics rounded-3 px-3 px-md-2 py-1 py-md-2 mb-12 w-100 Inter"
                    style={{
                      maxWidth: isPC ? "400px" : "100%",
                      margin: "0 auto",
                    }}
                  >
                    <div className="d-flex align-items-center my-1">
                      <div
                        className="text12 text-md16 text-center text-theme-text game-launch-disclaimer"
                        dangerouslySetInnerHTML={{
                          __html: productDetail?.disclaimer || "",
                        }}
                      ></div>
                    </div>

                    <div
                      onClick={handleAgreementCheck}
                      className="d-flex align-items-center gap-2 w-100 mb-1"
                    >
                      {" "}
                      <input
                        type="checkbox"
                        id="lobby-agree"
                        className="icon-md28 icon20 me-2"
                        checked={form?.argee}
                      />
                      <div className="text12 text-game-launch-dialog-title">
                        {t("I have agreed to these terms and conditions.")}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {!appConfig.gameLaunch?.hideWalletName && (
              <div className="text-md12 text10 fwNoweight-bold">
                {t(walletName || "---")}
              </div>
            )}

            <div className="d-flex align-items-center justify-content-between text14 text-md18 fwNoweight-bold mb-12">
              <span>
                {t("In Game Balance")} ({currency}):
              </span>

              <span className="text16 text-md24 fwNoweight-bold text-game-launch-dialog-title ms-3">
                {formattedWalletAmountInGame}
              </span>
            </div>

            <div className="d-flex column-gap-12 mb-2">
              <div className="border-2 border-gradient-border-game-launch-dialog-statistics iconh-i40 iconh-i-md48 rounded-3 col">
                <input
                  style={{
                    outline: "none",
                  }}
                  type="text"
                  inputMode="decimal"
                  pattern="[0-9.]*"
                  className="Inter text14 text-md18 text-center text-theme-text bg-transparent border-0 h-100 w-100 game-launch-dialog__amount-input"
                  value={formattedWalletAmount}
                  placeholder={t("Amount")}
                  // onChange={handleGameEntryAmountChange}
                  disabled
                />
              </div>

              <Button
                onClick={handleTopUp}
                className="bg-deposit-button minw-fit iconh-i40 iconw-i-md48 iconh-i-md48 d-flex-center rounded-10 p-10 text-decoration-none"
              >
                <img
                  src="/images/sidebar/deposit.png"
                  alt="top up"
                  className="icon20"
                />
                {/* {t("deposit")} */}
              </Button>
            </div>

            {/* --- Rebate & Turnover --- */}

            {/* Game Data Box for Regular Games */}
            {!appConfig?.gameLaunch?.hideGameStatistics && (
              <div className="bg-game-launch-dialog-statistics text-theme-text border-2 border-gradient-border-game-launch-dialog-statistics rounded-3 p-3 px-2 mt-3">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <span className="text14 text-md18">{t("Rebate")}: </span>
                  <span className="text14 text-md18 fw-bold">
                    {isNaN(parseFloat(productDetail?.rebate))
                      ? "--"
                      : `${productDetail?.rebate}%`}
                  </span>
                </div>

                <div className="d-flex align-items-center justify-content-between mb-2">
                  <span className="text14 text-md18">
                    {t("Yesterday Turnover")}:
                  </span>
                  <span className="text14 text-md18 fw-bold">
                    {formatTurnoverDisplay(
                      productDetail?.yesterday_stake,
                      currency,
                    )}
                  </span>
                </div>

                <div className="d-flex align-items-center justify-content-between">
                  <span className="text14 text-md18">
                    {t("Today Turnover")}:{" "}
                  </span>
                  <span className="text14 text-md18 fw-bold">
                    {formatTurnoverDisplay(
                      productDetail?.today_stake,
                      currency,
                    )}
                  </span>
                </div>
              </div>
            )}
          </div>{" "}
        </div>
      </div>

      {/* button */}
      {/* <div className="d-flex gap-2 w-100"> */}
      <div className="dialog-buttons">
        <Button
          onClick={() => onf7DialogConfirm(false, { data: null })}
          // className={`mt-3 border-2 text-16 text-md20 fwNoweight-bold text-color-black py-2 py-md-12 rounded-10 w-100 ${"btn-secondary"}`}
          className="dialog-button text-decoration-none"
        >
          {t("Cancel")}
        </Button>

        {/* --- Start Game Button --- */}
        <Button
          onClick={handleStartGame}
          // className={`mt-3 border-2 text-16 text-md20 fwNoweight-bold py-2 py-md-12 w-100 ${"btn-primary"}`}
          className="dialog-button text-decoration-none"
        >
          {t("Start Game")}
        </Button>
      </div>
    </div>
  );
}
