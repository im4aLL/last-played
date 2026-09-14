use serde::Deserialize;
use tauri::State;

use crate::commands::db::{health_for, DatabaseHealth};
use crate::config::{AppConfig, DbMode, PlayerPreferences};
use crate::error::Result;
use crate::state::AppState;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConfigInput {
    pub device_name: String,
    pub db_mode: Option<DbMode>,
    pub tmdb_api_key: String,
    pub turso_url: String,
    pub turso_auth_token: String,
    pub player: PlayerPreferences,
}

#[tauri::command]
pub fn get_config(state: State<'_, AppState>) -> AppConfig {
    state.config()
}

#[tauri::command]
pub fn get_device_id(state: State<'_, AppState>) -> String {
    state.config().device_id
}

#[tauri::command]
pub fn save_config(state: State<'_, AppState>, input: ConfigInput) -> Result<AppConfig> {
    state.update_config(|config| {
        config.device_name = input.device_name;
        config.db_mode = input.db_mode;
        config.tmdb_api_key = input.tmdb_api_key;
        config.turso_url = input.turso_url;
        config.turso_auth_token = input.turso_auth_token;
        config.player = input.player;
    })
}

#[tauri::command]
pub async fn set_db_mode(
    state: State<'_, AppState>,
    mode: DbMode,
    turso_url: Option<String>,
    turso_auth_token: Option<String>,
) -> Result<DatabaseHealth> {
    state.update_config(|config| {
        config.db_mode = Some(mode);
        if let Some(url) = turso_url {
            config.turso_url = url;
        }
        if let Some(token) = turso_auth_token {
            config.turso_auth_token = token;
        }
    })?;

    health_for(&state).await
}
