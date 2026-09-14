use std::path::PathBuf;
use std::sync::Mutex;

use tokio::sync::Mutex as AsyncMutex;

use crate::config::{self, AppConfig, DbMode};
use crate::db::Database;
use crate::error::{AppError, Result};
use crate::services::player::{NativeSurface, PlayerService};
use crate::services::sync::SyncManager;

pub struct AppState {
    config_path: PathBuf,
    db_path: PathBuf,
    config: Mutex<AppConfig>,
    database: AsyncMutex<Option<Database>>,
    player: Mutex<Option<PlayerService>>,
    surface: Mutex<Option<NativeSurface>>,
    sync: SyncManager,
}

impl AppState {
    pub fn new(config_path: PathBuf, db_path: PathBuf) -> Result<Self> {
        let config = AppConfig::load(&config_path)?;
        Ok(Self {
            config_path,
            db_path,
            config: Mutex::new(config),
            database: AsyncMutex::new(None),
            player: Mutex::new(None),
            surface: Mutex::new(None),
            sync: SyncManager::new(),
        })
    }

    pub fn player(&self) -> std::sync::MutexGuard<'_, Option<PlayerService>> {
        self.player
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner())
    }

    pub fn surface(&self) -> std::sync::MutexGuard<'_, Option<NativeSurface>> {
        self.surface
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner())
    }

    pub fn config(&self) -> AppConfig {
        self.config
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner())
            .clone()
    }

    pub fn db_path(&self) -> PathBuf {
        self.db_path.clone()
    }

    pub fn sync_manager(&self) -> &SyncManager {
        &self.sync
    }

    pub fn update_config(&self, update: impl FnOnce(&mut AppConfig)) -> Result<AppConfig> {
        let next = {
            let mut guard = self
                .config
                .lock()
                .unwrap_or_else(|poisoned| poisoned.into_inner());
            update(&mut guard);
            guard.clone()
        };
        config::save(&self.config_path, &next)?;
        Ok(next)
    }

    pub async fn database(&self) -> Result<Database> {
        let mut guard = self.database.lock().await;
        if let Some(database) = guard.as_ref() {
            return Ok(database.clone());
        }

        let config = self.config();
        let database = match config.db_mode {
            Some(DbMode::Remote) => {
                if config.turso_url.trim().is_empty() {
                    return Err(AppError::Config(
                        "Remote mode needs a Turso URL and auth token.".to_string(),
                    ));
                }
                Database::open_remote(&self.db_path, &config.turso_url, &config.turso_auth_token)
                    .await?
            }
            _ => Database::open_local(&self.db_path).await?,
        };

        let connection = database.connect().await?;
        crate::db::repositories::device::register(
            &connection,
            &config.device_id,
            &config.device_name,
            std::env::consts::OS,
        )
        .await?;

        *guard = Some(database.clone());
        Ok(database)
    }

    /// Closes the cached handle so the next access reopens with the current mode.
    pub async fn reset_database(&self) {
        let mut guard = self.database.lock().await;
        *guard = None;
    }

    /// Pushes local changes in the background after a meaningful write.
    pub async fn trigger_sync(&self) {
        let Ok(database) = self.database().await else {
            return;
        };
        if !database.is_remote() {
            return;
        }

        let sync = self.sync.clone();
        tauri::async_runtime::spawn(async move {
            if let Err(error) = crate::services::sync::run(&database, &sync, true).await {
                eprintln!("background sync failed: {error}");
            }
        });
    }
}
