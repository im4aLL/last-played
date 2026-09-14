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
#[serde(rename_all = "camelCase")]
pub struct PlayerPreferences {
    pub watched_threshold: u8,
    pub subtitle_language: String,
    pub audio_language: String,
    pub volume: u8,
}

impl Default for PlayerPreferences {
    fn default() -> Self {
        Self {
            watched_threshold: 90,
            subtitle_language: "en".to_string(),
            audio_language: "en".to_string(),
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
