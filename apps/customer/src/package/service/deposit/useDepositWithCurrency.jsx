import React, { useState, useEffect, useRef, useMemo } from "react";
import { useRecoilValue } from "recoil";
import { useTranslation } from "react-i18next";

const normalizeApiOriItem = (oriItem) => {
  if (!oriItem) {
    return {
      list: [],
      map: {},
    };
  }

  let list = [];

  if (Array.isArray(oriItem)) {
    list = oriItem.map(({ list, image, ...i }) => {
      return {
        label: i?.currency,
        value: i?.currency,
        ...i,
        optionMap: list,
        img: image,
      };
    });
  } // object mode
  else if (Object.values(oriItem)?.length > 0) {
    list = Object.entries(oriItem).map(([currency, detail]) => ({
      label: currency,
      value: currency,
      img: detail?.image,
      rate: detail?.rate,
      optionMap: detail?.list,
    }));
  }

  const map = list.reduce((acc, item) => {
    const { value, ...restItem } = item;
    acc[value] = restItem || null;
    return acc;
  }, {});

  return {
    list,
    map,
  };
};

export default function useDepositWithCurrency({
  selectFirstOnInit = false,
  onInitCurrency = null,
  fullDepositItem = null,
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
    const { list, map } = normalizeApiOriItem(fullDepositItem);

    return { currencyList: list, currencyAndListMap: map };
  }, [fullDepositItem]);

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
    paymentOptionItem: currentPaymentOptionItem,
  };
}
