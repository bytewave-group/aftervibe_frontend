import { atom } from "recoil";

const CatalogDataState = atom({
  key: "CatalogDataState",
  default: {
    selectedCategoryItem: {
      category: "",
      product: null,
    },
  },
});

export default CatalogDataState;
