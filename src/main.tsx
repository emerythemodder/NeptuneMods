import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { watchSystemTheme } from "./lib/appearance";
import { initAuth } from "./lib/auth";
import { initSync } from "./lib/sync";
import "./index.css";

watchSystemTheme();
initSync();
initAuth();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
