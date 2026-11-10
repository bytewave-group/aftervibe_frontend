import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import i18n from "./package/tool/i18n-init/i18n";
import "bootstrap/dist/css/bootstrap.min.css";

async function start() {
    const savedLanguage = localStorage.getItem("customer_language");

    if (savedLanguage === "en" || savedLanguage === "cn") {
        await i18n.changeLanguage(savedLanguage);
    }

    createRoot(document.getElementById("app")).render(<App />);
}

start();