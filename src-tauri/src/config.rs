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

/// Relative subtitle sizes matching libVLC's `freetype-rel-fontsize`.
/// Smaller values render larger: 32 is Smallest, 26 Tiny, 20 Smaller,
/// 18 Small, 16 Normal, 12 Large, 6 Larger. Zero keeps the renderer's
/// automatic size. libVLC accepts any integer here, not just the presets;
/// larger numbers keep shrinking the text.
pub const SUBTITLE_SIZE_AUTO: u16 = 0;
pub const SUBTITLE_SIZE_SMALLEST: u16 = 32;
pub const SUBTITLE_SIZE_TINY: u16 = 26;
pub const SUBTITLE_SIZE_SMALLER: u16 = 20;
pub const SUBTITLE_SIZE_SMALL: u16 = 18;
pub const SUBTITLE_SIZE_NORMAL: u16 = 16;
pub const SUBTITLE_SIZE_LARGE: u16 = 12;
pub const SUBTITLE_SIZE_LARGER: u16 = 6;

/// All valid relative subtitle sizes, including auto.
pub const SUBTITLE_SIZES: [u16; 8] = [
    SUBTITLE_SIZE_AUTO,
    SUBTITLE_SIZE_SMALLEST,
    SUBTITLE_SIZE_TINY,
    SUBTITLE_SIZE_SMALLER,
    SUBTITLE_SIZE_SMALL,
    SUBTITLE_SIZE_NORMAL,
    SUBTITLE_SIZE_LARGE,
    SUBTITLE_SIZE_LARGER,
];

/// Normalizes a stored subtitle size to a valid relative value.
///
/// Older configs stored absolute pixels (`freetype-fontsize`). Those are
/// mapped to the closest relative bucket so existing preferences keep
/// roughly the same intent instead of resetting.
pub fn normalize_subtitle_size(value: u16) -> u16 {
    if SUBTITLE_SIZES.contains(&value) {
        return value;
    }
    match value {
        1..=20 => SUBTITLE_SIZE_SMALLER,
        21..=30 => SUBTITLE_SIZE_SMALL,
        31..=44 => SUBTITLE_SIZE_NORMAL,
        45..=64 => SUBTITLE_SIZE_LARGE,
        _ => SUBTITLE_SIZE_LARGER,
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct PlayerPreferences {
    pub watched_threshold: u8,
    pub subtitle_language: String,
    pub audio_language: String,
    /// Relative subtitle size matching libVLC's `freetype-rel-fontsize`.
    /// Unlike the old absolute `freetype-fontsize` in pixels, this scales
    /// with the video size so windowed and fullscreen look the same
    /// proportion. Zero keeps the renderer's automatic size.
    pub subtitle_size: u16,
    /// Subtitle font family matching libVLC's `freetype-font`. Empty keeps
    /// the renderer's default. The family must be installed on the device,
    /// and only plain-text subtitles use it.
    pub subtitle_font: String,
    pub volume: u8,
}

impl Default for PlayerPreferences {
    fn default() -> Self {
        Self {
            watched_threshold: 90,
            subtitle_language: "en".to_string(),
            audio_language: "en".to_string(),
            subtitle_size: 0,
            subtitle_font: String::new(),
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
        let mut config: AppConfig =
            serde_json::from_str(&contents).map_err(|error| AppError::Config(error.to_string()))?;
        // Migrate legacy absolute-pixel sizes to relative buckets.
        config.player.subtitle_size = normalize_subtitle_size(config.player.subtitle_size);
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
