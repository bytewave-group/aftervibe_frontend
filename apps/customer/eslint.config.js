import globals from "globals";
import react from "eslint-plugin-react";
import { pluginsEntry, plugin } from "@my-common-tool/tool/custom-eslint-rules";

const showCustomRule = true;

export default [
  {
    ignores: ["dist/**", "node_modules/**"],
  },
  {
    files: ["src/**/*.{js,jsx,ts,tsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",

      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },

      globals: {
        ...globals.browser,
      },
    },

    plugins: {
      react,
      ...(showCustomRule ? pluginsEntry : {}),
    },

    rules: {
      "no-undef": "error",
      //   "no-unused-vars": "warn",
      "no-console": "off",
      ...(showCustomRule ? plugin.configs.recommended.rules : {}),
    },
  },
];
