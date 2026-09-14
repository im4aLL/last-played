use std::path::Path;

use turso::{Builder, Connection, Database as TursoDatabase};

use crate::error::{AppError, Result};

pub mod migrations;

pub const DB_FILE_NAME: &str = "library.db";

#[derive(Clone)]
pub struct Database {
    inner: TursoDatabase,
}

impl Database {
    pub async fn open_local(path: &Path) -> Result<Self> {
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent)
                .map_err(|error| AppError::Database(error.to_string()))?;
        }

        let inner = Builder::new_local(path.to_string_lossy().as_ref())
            .build()
            .await
            .map_err(|error| AppError::Database(error.to_string()))?;

        let connection = inner.connect()?;
        migrations::run(&connection).await?;

        Ok(Self { inner })
    }

    pub fn connect(&self) -> Result<Connection> {
        self.inner.connect().map_err(Into::into)
    }

    pub async fn schema_version(&self) -> Result<i64> {
        let connection = self.connect()?;
        migrations::current_version(&connection).await
    }
}
