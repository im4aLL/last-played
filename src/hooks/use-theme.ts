import { useEffect } from "react";
import { create } from "zustand";

export type Theme = "light" | "dark";
export type ThemePreference = Theme | "system";

const STORAGE_KEY = "last-played:theme";
const DARK_QUERY = "(prefers-color-scheme: dark)";

function systemPrefersDark(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return true;
  }
  return window.matchMedia(DARK_QUERY).matches;
}

function resolveTheme(preference: ThemePreference): Theme {
  if (preference === "system") {
    return systemPrefersDark() ? "dark" : "light";
  }
  return preference;
}

function readPreference(): ThemePreference {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    if (value === "light" || value === "dark" || value === "system") {
      return value;
    }
  } catch {
    // Storage can be unavailable; fall back to the system preference.
  }
  return "system";
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

type ThemeState = {
  preference: ThemePreference;
  theme: Theme;
  setPreference: (preference: ThemePreference) => void;
  toggleTheme: () => void;
};

export const useThemeStore = create<ThemeState>((set, get) => {
  const preference = readPreference();
  return {
    preference,
    theme: resolveTheme(preference),
    setPreference: (next) => {
      try {
        window.localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // Persisting the preference is best-effort.
      }
      set({ preference: next, theme: resolveTheme(next) });
    },
    toggleTheme: () => {
      get().setPreference(get().theme === "dark" ? "light" : "dark");
    },
  };
});

export function useTheme() {
  const theme = useThemeStore((state) => state.theme);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);
  return { theme, toggleTheme };
}

export function useThemeEffect() {
  const preference = useThemeStore((state) => state.preference);
  const theme = useThemeStore((state) => state.theme);
  const setPreference = useThemeStore((state) => state.setPreference);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    if (preference !== "system" || typeof window.matchMedia !== "function") {
      return;
    }
    const media = window.matchMedia(DARK_QUERY);
    const onChange = () => setPreference("system");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [preference, setPreference]);
}
