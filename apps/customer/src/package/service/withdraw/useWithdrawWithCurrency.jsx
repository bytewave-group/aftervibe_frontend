import React, { useState, useEffect, useRef, useMemo } from "react";

const convertBankDataToCurrencyMap = (data) => {
  const result = {};

  data.withdraw_bank?.forEach(({ currency, list }) => {
    result[currency] = {
      member_bank: [],
      withdraw_bank: list || [],
    };
  });

  data.member_bank?.forEach(({ currency, list }) => {
    if (result[currency]) {
      result[currency].member_bank = list || [];
    }
  });

  data.rate?.forEach(({ currency, rate }) => {
    if (result[currency]) {
      result[currency].rate = rate || "";
    }
  });

  return result;
};

const normalizeApiOriItem = (oriItem) => {
  if (!oriItem) {
    return {
      currencyList: [],
      map: {},
    };
  }

  /**
   *  { [currency]: { member_bank :[] , withdraw_bank : []  } , .... }
   */
  const afterNormalizeMap = convertBankDataToCurrencyMap(oriItem);

  const entries = Object.entries(afterNormalizeMap).map(
    ([currency, currencyDetail]) => {
      const systemBankList = Array.isArray(currencyDetail?.withdraw_bank)
        ? [...currencyDetail?.withdraw_bank]
        : [];

      const userBankList = Array.isArray(currencyDetail?.member_bank)
        ? [...currencyDetail?.member_bank]
        : [];

      if (systemBankList.length === 0) {
        return null;
      }

      const userBankMap = new Map(
        userBankList.map((item) => [item.bank, item]),
      );

      const finalBankList =
        userBankList.length > 0
          ? systemBankList
              .filter((bank) => userBankMap.has(bank.name))
              .map((bank) => {
                const userBank = userBankMap.get(bank.name);

                return {
                  ...bank,
                  image: bank?.image || "-",
                  label: bank?.name,
                  value: bank?.name,
                  bank_name: bank?.name,
                  account_name: userBank?.name,
                  account_number: userBank?.account,
                  disable: true,
                };
              })
          : systemBankList.map((bank) => ({
              ...bank,
              image: bank?.image || "-",
              label: bank?.name,
              value: bank?.name,
              bank_name: bank?.name,
              disable: false,
            }));

      return [
        currency,
        { optionMap: finalBankList, rate: currencyDetail?.rate },
      ];
    },
  );

  const validEntries = entries.filter(Boolean);

  const currencyList = validEntries.map(([cur, banklist]) => ({
    label: cur,
    value: cur,
  }));

  const finalCurrencyBankListMap = Object.fromEntries(validEntries);

  return {
    currencyList,
    map: finalCurrencyBankListMap,
  };
};

export default function useWithdrawWithCurrency({
  selectFirstOnInit = false,
  onInitCurrency = null,
  fullWithdrawItem = null,
  selectedCurrency,
}) {
  const [innerSelectedCurrency, setInnerSelectedCurrency] = useState(null);

  const isControlled = selectedCurrency !== undefined;

  const selectedCurrencyFinal = useMemo(() => {
    return selectedCurrency || innerSelectedCurrency;
  }, [selectedCurrency, innerSelectedCurrency]);

  //? ======================================================================
  //? currency list
  const { currencyList, currencyAndListMap } = useMemo(() => {
    const { currencyList, map } = normalizeApiOriItem(fullWithdrawItem);

    return { currencyList, currencyAndListMap: map };
  }, [fullWithdrawItem]);

  //?set default currency
  useEffect(() => {
    if (
      !selectFirstOnInit ||
      !!selectedCurrency ||
      typeof onInitCurrency !== "function"
    ) {
      return;
    }

    const firstItem = currencyList?.[0];

    if (!firstItem?.value) {
      return;
    }

    onInitCurrency(firstItem.value);
  }, [selectFirstOnInit, selectedCurrency, onInitCurrency, currencyList]);
  //? ======================================================================
  const currentCurrencyItem = useMemo(() => {
    return currencyAndListMap?.[selectedCurrencyFinal] || null;
  }, [currencyAndListMap, selectedCurrencyFinal]);

  const currentExchangeRate = currentCurrencyItem?.rate || 1;

  const currentPaymentOptionItem = currentCurrencyItem?.optionMap || null;

  const updateSelectedCurrency = (value) => {
    if (!isControlled) {
      setInnerSelectedCurrency(value);
    }
  };

  return {
    currencyList,
    currentExchangeRate,
    updateSelectedCurrency, //?need , if no pass selectedCurrency in
    bankList: currentPaymentOptionItem,
  };
}
