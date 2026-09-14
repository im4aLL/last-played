import { create } from "zustand";

export type DbMode = "local" | "remote";

export type PlayerPreferences = {
  watchedThreshold: number;
  subtitleLanguage: string;
  audioLanguage: string;
  volume: number;
};

export type AppConfig = {
  dbMode: DbMode | null;
  tmdbApiKey: string;
  deviceName: string;
  tursoUrl: string;
  tursoAuthToken: string;
  player: PlayerPreferences;
};

export const LANGUAGE_OPTIONS = [
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "pt", label: "Portuguese" },
  { value: "it", label: "Italian" },
  { value: "ja", label: "Japanese" },
  { value: "ko", label: "Korean" },
];

export const DEFAULT_CONFIG: AppConfig = {
  dbMode: null,
  tmdbApiKey: "",
  deviceName: "",
  tursoUrl: "",
  tursoAuthToken: "",
  player: {
    watchedThreshold: 90,
    subtitleLanguage: "en",
    audioLanguage: "en",
    volume: 100,
  },
};

type AppConfigState = AppConfig & {
  setDbMode: (mode: DbMode) => void;
  setTmdbApiKey: (key: string) => void;
  setDeviceName: (name: string) => void;
  setTursoUrl: (url: string) => void;
  setTursoAuthToken: (token: string) => void;
  setPlayerPreferences: (preferences: Partial<PlayerPreferences>) => void;
};

export const useAppConfig = create<AppConfigState>((set) => ({
  ...DEFAULT_CONFIG,
  setDbMode: (dbMode) => set({ dbMode }),
  setTmdbApiKey: (tmdbApiKey) => set({ tmdbApiKey }),
  setDeviceName: (deviceName) => set({ deviceName }),
  setTursoUrl: (tursoUrl) => set({ tursoUrl }),
  setTursoAuthToken: (tursoAuthToken) => set({ tursoAuthToken }),
  setPlayerPreferences: (preferences) =>
    set((state) => ({ player: { ...state.player, ...preferences } })),
}));
