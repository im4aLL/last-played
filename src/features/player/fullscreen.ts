import { isTauri } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";

export async function enterNativeFullscreen(): Promise<boolean> {
  if (!isTauri()) return false;
  try {
    await getCurrentWindow().setFullscreen(true);
    return true;
  } catch {
    return false;
  }
}

export async function exitNativeFullscreen(): Promise<boolean> {
  if (!isTauri()) return false;
  try {
    await getCurrentWindow().setFullscreen(false);
    return true;
  } catch {
    return false;
  }
}
