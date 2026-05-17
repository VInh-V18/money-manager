import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { useThemeStore } from "@/stores/useThemeStore";

// Apply theme từ localStorage trước khi render để tránh flash
useThemeStore.getState().applyToDocument();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
