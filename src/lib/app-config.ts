import { create } from "zustand";
import * as api from "@/lib/api";

export type DbMode = "local" | "remote";

export type PlayerPreferences = {
  watchedThreshold: number;
  subtitleLanguage: string;
  audioLanguage: string;
  subtitleScale: number;
  volume: number;
};

export type AppConfig = {
  deviceId: string;
  dbMode: DbMode | null;
  tmdbApiKey: string;
  deviceName: string;
  tursoUrl: string;
  tursoAuthToken: string;
  player: PlayerPreferences;
};

export type ConfigInput = Omit<AppConfig, "deviceId">;

export type DatabaseHealth = {
  mode: DbMode | null;
  path: string | null;
  schemaVersion: number;
};

export type SyncState = "idle" | "syncing" | "error";

export type SyncStatus = {
  enabled: boolean;
  state: SyncState;
  lastSyncedAt: number | null;
  error: string | null;
  pending: boolean;
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
  deviceId: "",
  dbMode: null,
  tmdbApiKey: "",
  deviceName: "",
  tursoUrl: "",
  tursoAuthToken: "",
  player: {
    watchedThreshold: 90,
    subtitleLanguage: "en",
    audioLanguage: "en",
    subtitleScale: 100,
    volume: 100,
  },
};

type AppConfigState = AppConfig & {
  loaded: boolean;
  health: DatabaseHealth | null;
  load: () => Promise<void>;
  refreshHealth: () => Promise<void>;
  setDbMode: (
    mode: DbMode,
    credentials?: { tursoUrl?: string; tursoAuthToken?: string },
  ) => Promise<void>;
  setTmdbApiKey: (key: string) => void;
  setDeviceName: (name: string) => void;
  setTursoUrl: (url: string) => void;
  setTursoAuthToken: (token: string) => void;
  setPlayerPreferences: (preferences: Partial<PlayerPreferences>) => void;
};

const SAVE_DELAY_MS = 400;
let saveTimer: ReturnType<typeof setTimeout> | undefined;
let loading = false;

function toInput(state: AppConfigState): ConfigInput {
  const { deviceName, dbMode, tmdbApiKey, tursoUrl, tursoAuthToken, player } =
    state;
  return { deviceName, dbMode, tmdbApiKey, tursoUrl, tursoAuthToken, player };
}

function scheduleSave() {
  if (saveTimer) {
    clearTimeout(saveTimer);
  }
  saveTimer = setTimeout(() => {
    saveTimer = undefined;
    const state = useAppConfig.getState();
    void api
      .saveConfig(toInput(state))
      .catch((error) => console.error("Failed to save config", error));
  }, SAVE_DELAY_MS);
}

export const useAppConfig = create<AppConfigState>((set, get) => ({
  ...DEFAULT_CONFIG,
  loaded: false,
  health: null,

  load: async () => {
    if (get().loaded || loading) return;
    loading = true;
    try {
      const config = await api.getConfig();
      set({ ...config, loaded: true });
      if (config.dbMode) {
        void get().refreshHealth();
      }
    } catch (error) {
      console.error("Failed to load config", error);
      set({ loaded: true });
    } finally {
      loading = false;
    }
  },

  refreshHealth: async () => {
    try {
      const health = await api.getHealth();
      set({ health });
    } catch (error) {
      console.error("Failed to read database health", error);
    }
  },

  setDbMode: async (mode, credentials) => {
    const current = get();
    const tursoUrl = credentials?.tursoUrl ?? current.tursoUrl;
    const tursoAuthToken =
      credentials?.tursoAuthToken ?? current.tursoAuthToken;

    set({ dbMode: mode, tursoUrl, tursoAuthToken });
    const health = await api.setDbMode(mode, tursoUrl, tursoAuthToken);
    set({ health });
  },

  setTmdbApiKey: (tmdbApiKey) => {
    set({ tmdbApiKey });
    scheduleSave();
  },
  setDeviceName: (deviceName) => {
    set({ deviceName });
    scheduleSave();
  },
  setTursoUrl: (tursoUrl) => {
    set({ tursoUrl });
    scheduleSave();
  },
  setTursoAuthToken: (tursoAuthToken) => {
    set({ tursoAuthToken });
    scheduleSave();
  },
  setPlayerPreferences: (preferences) => {
    set((state) => ({ player: { ...state.player, ...preferences } }));
    scheduleSave();
  },
}));
