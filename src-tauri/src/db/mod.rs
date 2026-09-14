use std::path::Path;
use std::sync::Arc;

use turso::{Builder, Connection, Database as TursoDatabase};

use crate::error::{AppError, Result};
use crate::services::remote::RemoteClient;

pub mod migrations;
pub mod repositories;

pub const DB_FILE_NAME: &str = "library.db";

/// A local SQLite-compatible database, plus an optional Turso HTTP client.
///
/// Both modes use the same local file so the app works offline. Remote mode
/// adds a [`RemoteClient`] that [`crate::services::sync`] uses to reconcile
/// rows with the remote database through the Turso HTTP API.
#[derive(Clone)]
pub struct Database {
    inner: TursoDatabase,
    remote: Option<Arc<RemoteClient>>,
}

impl Database {
    pub async fn open_local(path: &Path) -> Result<Self> {
        ensure_parent_dir(path)?;

        let inner = Builder::new_local(path.to_string_lossy().as_ref())
            .build()
            .await
            .map_err(|error| AppError::Database(error.to_string()))?;

        let connection = inner.connect()?;
        migrations::run(&connection).await?;

        Ok(Self {
            inner,
            remote: None,
        })
    }

    pub async fn open_remote(path: &Path, url: &str, auth_token: &str) -> Result<Self> {
        let database = Self::open_local(path).await?;
        let remote = RemoteClient::new(url, auth_token)?;

        Ok(Self {
            inner: database.inner,
            remote: Some(Arc::new(remote)),
        })
    }

    pub fn is_remote(&self) -> bool {
        self.remote.is_some()
    }

    pub fn remote(&self) -> Option<&RemoteClient> {
        self.remote.as_deref()
    }

    pub async fn connect(&self) -> Result<Connection> {
        self.inner.connect().map_err(Into::into)
    }

    pub async fn schema_version(&self) -> Result<i64> {
        let connection = self.connect().await?;
        migrations::current_version(&connection).await
    }
}

fn ensure_parent_dir(path: &Path) -> Result<()> {
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|error| AppError::Database(error.to_string()))?;
    }
    Ok(())
}
