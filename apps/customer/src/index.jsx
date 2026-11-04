import React from "react";
import { createRoot } from "react-dom/client";
import Main from "./components/main";
import App from "./App";
import "./package/tool/i18n-init/i18n";
import "bootstrap/dist/css/bootstrap.min.css";

createRoot(document.getElementById("app")).render(<App />);