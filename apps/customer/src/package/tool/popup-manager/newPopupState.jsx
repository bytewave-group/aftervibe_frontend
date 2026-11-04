import { atom, atomFamily } from "recoil";

export const popupSharedDataFamily = atomFamily({
  key: "popupSharedDataFamily",
  default: {},
});

export const PopupKeyListState = atom({
  key: "popupKeyListState",
  default: [],
});

export const popupStateFamily = atomFamily({
  key: "popupStateFamily",
  default: {
    key: "",
    show: false,
    title: "",
    component: null,
    data: null,
    onSubmit: null,
    destroyPopup: null,
    autoClose: true,
    action: {},
  },
});
