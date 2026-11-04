import { atom } from "recoil";

const UserInGameState = atom({
  key: "userInGameState",

  default: {
    list: [
      {
        code: "",
        game: "",
        category: "",
      },
    ],
    optimistic: false,
  },
});

export default UserInGameState;
