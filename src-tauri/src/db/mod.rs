use std::path::Path;

use turso::{Builder, Connection, Database as TursoDatabase};

use crate::error::{AppError, Result};

pub mod migrations;
pub mod repositories;

pub const DB_FILE_NAME: &str = "library.db";

#[derive(Clone)]
pub enum Database {
    Local(TursoDatabase),
    Synced(turso::sync::Database),
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

        Ok(Self::Local(inner))
    }

    pub async fn open_remote(path: &Path, url: &str, auth_token: &str) -> Result<Self> {
        ensure_parent_dir(path)?;

        let mut builder =
            turso::sync::Builder::new_remote(path.to_string_lossy().as_ref()).with_remote_url(url);
        if !auth_token.trim().is_empty() {
            builder = builder.with_auth_token(auth_token);
        }

        let inner = builder
            .build()
            .await
            .map_err(|error| AppError::Database(error.to_string()))?;

        let connection = inner
            .connect()
            .await
            .map_err(|error| AppError::Database(error.to_string()))?;
        migrations::run(&connection).await?;

        Ok(Self::Synced(inner))
    }

    pub fn is_remote(&self) -> bool {
        matches!(self, Self::Synced(_))
    }

    pub async fn connect(&self) -> Result<Connection> {
        match self {
            Self::Local(inner) => inner.connect().map_err(Into::into),
            Self::Synced(inner) => inner
                .connect()
                .await
                .map_err(|error| AppError::Database(error.to_string())),
        }
    }

    pub async fn push(&self) -> Result<()> {
        match self {
            Self::Local(_) => Ok(()),
            Self::Synced(inner) => inner
                .push()
                .await
                .map_err(|error| AppError::Database(error.to_string())),
        }
    }

    pub async fn pull(&self) -> Result<bool> {
        match self {
            Self::Local(_) => Ok(false),
            Self::Synced(inner) => inner
                .pull()
                .await
                .map_err(|error| AppError::Database(error.to_string())),
        }
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
