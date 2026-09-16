import { create } from "zustand";

export type OfflineScope = "add" | "test";

type ConnectionState = {
  online: boolean;
  overrides: { add: boolean; test: boolean };
  setOnline: (online: boolean) => void;
  tryAnyway: (scope: OfflineScope) => void;
  clearOverride: (scope: OfflineScope) => void;
  clearAllOverrides: () => void;
};

export const useConnection = create<ConnectionState>((set) => ({
  online:
    typeof navigator !== "undefined" && typeof navigator.onLine === "boolean"
      ? navigator.onLine
      : false,
  overrides: { add: false, test: false },
  setOnline: (online) => set({ online }),
  tryAnyway: (scope) =>
    set((state) => ({
      overrides: { ...state.overrides, [scope]: true },
    })),
  clearOverride: (scope) =>
    set((state) => ({
      overrides: { ...state.overrides, [scope]: false },
    })),
  clearAllOverrides: () => set({ overrides: { add: false, test: false } }),
}));

export const selectOnline = (state: ConnectionState) => state.online;

export const selectAddOnline = (state: ConnectionState) =>
  state.online || state.overrides.add;

export const selectTestOnline = (state: ConnectionState) =>
  state.online || state.overrides.test;
