import { isTauri } from "@tauri-apps/api/core";
import { getCurrentWebview } from "@tauri-apps/api/webview";
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

/**
 * macOS ignores key events until the `WKWebView` is the first responder. The
 * native video surface swallows clicks over the video area, so the webview is
 * never focused by clicking; focus it explicitly to keep the keybindings alive.
 */
export async function focusWebview(): Promise<void> {
  if (!isTauri()) return;
  try {
    await getCurrentWebview().setFocus();
  } catch {
    // The DOM listener still runs whenever the webview already has focus.
  }
}
