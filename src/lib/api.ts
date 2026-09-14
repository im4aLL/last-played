import { invoke } from "@tauri-apps/api/core";
import type {
  AppConfig,
  ConfigInput,
  DatabaseHealth,
  DbMode,
} from "./app-config";

export function getConfig(): Promise<AppConfig> {
  return invoke<AppConfig>("get_config");
}

export function saveConfig(input: ConfigInput): Promise<AppConfig> {
  return invoke<AppConfig>("save_config", { input });
}

export function setDbMode(
  mode: DbMode,
  tursoUrl?: string,
  tursoAuthToken?: string,
): Promise<DatabaseHealth> {
  return invoke<DatabaseHealth>("set_db_mode", {
    mode,
    tursoUrl: tursoUrl ?? null,
    tursoAuthToken: tursoAuthToken ?? null,
  });
}

export function getHealth(): Promise<DatabaseHealth> {
  return invoke<DatabaseHealth>("get_health");
}

export function testDbConnection(): Promise<DatabaseHealth> {
  return invoke<DatabaseHealth>("test_db_connection");
}

export function getDeviceId(): Promise<string> {
  return invoke<string>("get_device_id");
}
