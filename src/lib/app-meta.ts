import {
  getIdentifier,
  getName,
  getTauriVersion,
  getVersion,
} from "@tauri-apps/api/app";
import packageJson from "../../package.json";

export const APP_NAME = "Last Played";
export const APP_AUTHOR = "Hadi";
export const REPOSITORY_URL = "https://github.com/im4aLL/last-played";
export const ISSUES_URL = `${REPOSITORY_URL}/issues/new`;

export type AppInfo = {
  name: string;
  version: string;
  identifier: string;
  tauriVersion: string;
};

const FALLBACK_INFO: AppInfo = {
  name: APP_NAME,
  version: packageJson.version,
  identifier: "",
  tauriVersion: "",
};

export async function loadAppInfo(): Promise<AppInfo> {
  try {
    const [name, version, identifier, tauriVersion] = await Promise.all([
      getName(),
      getVersion(),
      getIdentifier(),
      getTauriVersion(),
    ]);
    return { name, version, identifier, tauriVersion };
  } catch {
    return FALLBACK_INFO;
  }
}
