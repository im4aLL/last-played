use std::path::PathBuf;
use std::sync::Mutex;

use tokio::sync::Mutex as AsyncMutex;

use crate::config::{self, AppConfig};
use crate::db::Database;
use crate::error::Result;
use crate::services::player::{NativeSurface, PlayerService};

pub struct AppState {
    config_path: PathBuf,
    db_path: PathBuf,
    config: Mutex<AppConfig>,
    database: AsyncMutex<Option<Database>>,
    player: Mutex<Option<PlayerService>>,
    surface: Mutex<Option<NativeSurface>>,
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

        let database = Database::open_local(&self.db_path).await?;
        let config = self.config();
        let connection = database.connect()?;
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
}
