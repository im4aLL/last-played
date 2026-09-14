use std::fs;
use std::path::Path;

use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::error::{AppError, Result};

pub const CONFIG_FILE_NAME: &str = "config.json";

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum DbMode {
    Local,
    Remote,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct PlayerPreferences {
    pub watched_threshold: u8,
    pub subtitle_language: String,
    pub audio_language: String,
    /// Subtitle text scale as a percentage, matching libVLC's `sub-text-scale`
    /// (valid range 10..=500, where 100 keeps the renderer's default size).
    pub subtitle_scale: u16,
    pub volume: u8,
}

impl Default for PlayerPreferences {
    fn default() -> Self {
        Self {
            watched_threshold: 90,
            subtitle_language: "en".to_string(),
            audio_language: "en".to_string(),
            subtitle_scale: 100,
            volume: 100,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppConfig {
    pub device_id: String,
    pub device_name: String,
    pub db_mode: Option<DbMode>,
    pub tmdb_api_key: String,
    pub turso_url: String,
    pub turso_auth_token: String,
    pub player: PlayerPreferences,
}

impl AppConfig {
    fn generate() -> Self {
        Self {
            device_id: Uuid::new_v4().to_string(),
            device_name: default_device_name(),
            db_mode: None,
            tmdb_api_key: String::new(),
            turso_url: String::new(),
            turso_auth_token: String::new(),
            player: PlayerPreferences::default(),
        }
    }

    pub fn load(path: &Path) -> Result<Self> {
        if !path.exists() {
            let config = Self::generate();
            save(path, &config)?;
            return Ok(config);
        }

        let contents =
            fs::read_to_string(path).map_err(|error| AppError::Config(error.to_string()))?;
        let config: AppConfig =
            serde_json::from_str(&contents).map_err(|error| AppError::Config(error.to_string()))?;
        Ok(config)
    }
}

pub fn save(path: &Path, config: &AppConfig) -> Result<()> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|error| AppError::Config(error.to_string()))?;
    }
    let contents = serde_json::to_string_pretty(config)
        .map_err(|error| AppError::Config(error.to_string()))?;
    fs::write(path, contents).map_err(|error| AppError::Config(error.to_string()))?;
    restrict_permissions(path)?;
    Ok(())
}

/// The config file holds the TMDB API key and the Turso auth token. Keep it
/// readable and writable only by the current user, since the whole database
/// (including this file's directory) may be visible to other local accounts.
#[cfg(unix)]
fn restrict_permissions(path: &Path) -> Result<()> {
    use std::os::unix::fs::PermissionsExt;

    let permissions = fs::Permissions::from_mode(0o600);
    fs::set_permissions(path, permissions).map_err(|error| AppError::Config(error.to_string()))?;
    Ok(())
}

#[cfg(not(unix))]
fn restrict_permissions(_path: &Path) -> Result<()> {
    Ok(())
}

fn default_device_name() -> String {
    let hostname = gethostname::gethostname()
        .to_string_lossy()
        .trim()
        .to_string();
    if hostname.is_empty() {
        "This device".to_string()
    } else {
        hostname
    }
}
