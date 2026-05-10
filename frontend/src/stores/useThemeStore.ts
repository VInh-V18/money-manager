import { create } from "zustand";
import { persist } from "zustand/middleware";

type Theme = "light" | "dark";

interface ThemeState {
  theme: Theme;
  toggle: () => void;
  setTheme: (t: Theme) => void;
  applyToDocument: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: "light",
      toggle: () => {
        const next = get().theme === "light" ? "dark" : "light";
        set({ theme: next });
        get().applyToDocument();
      },
      setTheme: (t) => {
        set({ theme: t });
        get().applyToDocument();
      },
      applyToDocument: () => {
        const root = document.documentElement;
        if (get().theme === "dark") root.classList.add("dark");
        else root.classList.remove("dark");
      },
    }),
    { name: "money-manager-theme" }
  )
);
