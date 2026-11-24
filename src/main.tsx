import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "@/App";
import { loadRuntimeConfig } from "@/env";
import { initI18n } from "@/i18n";
import "@/styles/globals.css";

await loadRuntimeConfig();
await initI18n();

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element '#root' not found");
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
