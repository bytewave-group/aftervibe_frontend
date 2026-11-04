import React, { useState, useEffect, useRef, useMemo } from "react";
import { useRecoilState, useRecoilValue } from "recoil";
import { useTranslation } from "react-i18next";

// import { useGlobalData } from "../../../context/GlobalDataContext";
// import { useLocation, useNavigate } from "react-router-dom";

import CatalogDataState from "./CatalogDataState";
import { Preferences } from "@capacitor/preferences";

import { navigate } from "@my-common-tool/tool/navigate";

import GlobalState from "../../../atoms/GlobalState";

export const CASINO_STATUS_MAINTENANCE = 4;
export const CASINO_STATUS_COMING_SOON = 5;

const safeParse = (value, fallback = {}) => {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    console.error("ERROR WHEN parse JSON");
    return fallback;
  }
};

const getSelectedGameCategory = async () => {
  const { value } = await Preferences.get({ key: "selectedGameCategory" });
  return value ? safeParse(value) : null;
};
const setSelectedGameCategory = async (item) => {
  await Preferences.set({
    key: "selectedGameCategory",
    value: JSON.stringify(item),
  });
};
const deleteSelectedGameCategory = async () => {
  await Preferences.remove({ key: "selectedGameCategory" });
};

export default function useCasinoCatalogDataNew() {
  const { t } = useTranslation();

  // const location = useLocation();
  // const navigate = useNavigate();

  const globalData = useRecoilValue(GlobalState);

  const [catalogData, setCatalogData] = useRecoilState(CatalogDataState);

  const { selectedCategoryItem } = catalogData;

  // const { globalData } = useGlobalData();

  const fullCategoryList = useMemo(() => {
    const raw = globalData?.product_settings?.products ?? [];
    if (raw.length === 0) return [];
    return raw
      .filter((p) => p?.category !== -1)
      .map((p, idx) => ({
        id: p?.category ?? idx,
        name: p?.title ?? "",
        image: p?.image ?? null,
        _raw: p,
        products: (p?.products ?? []).map((prod, i) => ({
          ...prod,
          id: prod?.code ?? i,
          image: prod?.image ?? null,
        })),
      }));
  }, [globalData?.product_settings?.products]);

  //? =============================================================================
  const updateSelectedGameCategory = async (product, shouldHideSidebar) => {
    const nextItem = {
      category: product?.category,
      product: product,
      hideSidebar: !!shouldHideSidebar,
    };
    setCatalogData((prev) => ({
      ...prev,
      selectedCategoryItem: nextItem,
    }));
    await setSelectedGameCategory(nextItem);
  };

  const gotoAllGamePage = async (
    product,
    shouldHideSidebar,
    { preferredProviderCode } = {},
  ) => {
    await updateSelectedGameCategory(product, shouldHideSidebar);
    const hasPreferred =
      preferredProviderCode != null && String(preferredProviderCode).length > 0;
    navigate("/games", {
      ...(hasPreferred
        ? { state: { preferredProviderCode: String(preferredProviderCode) } }
        : {}),
    });
  };

  const fetchSavedSelectedCategoryItem = async () => {
    const saved = await getSelectedGameCategory();

    if (saved) {
      setCatalogData((prev) => ({
        ...prev,
        selectedCategoryItem: saved,
      }));

      return { status: true };
    } else {
      return { status: false };
    }
  };

  return {
    gotoAllGamePage,

    selectedCategoryItem,
    fetchSavedSelectedCategoryItem,
    updateSelectedGameCategory,

    fullCategoryList,
  };
}
