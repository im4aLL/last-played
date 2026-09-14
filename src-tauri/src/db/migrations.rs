use turso::Connection;

use crate::error::{AppError, Result};

pub struct Migration {
    pub version: i64,
    pub name: &'static str,
    pub sql: &'static str,
}

pub const MIGRATIONS: &[Migration] = &[];

const CREATE_MIGRATIONS_TABLE: &str = "CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    applied_at TEXT NOT NULL
)";

pub async fn run(connection: &Connection) -> Result<i64> {
    connection
        .execute(CREATE_MIGRATIONS_TABLE, ())
        .await
        .map_err(|error| AppError::Database(error.to_string()))?;

    let current = current_version(connection).await?;

    for migration in MIGRATIONS.iter().filter(|m| m.version > current) {
        connection
            .execute_batch(migration.sql)
            .await
            .map_err(|error| AppError::Database(error.to_string()))?;

        connection
            .execute(
                "INSERT INTO schema_migrations (version, name, applied_at)
                 VALUES (?1, ?2, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))",
                (migration.version, migration.name),
            )
            .await
            .map_err(|error| AppError::Database(error.to_string()))?;
    }

    current_version(connection).await
}

pub async fn current_version(connection: &Connection) -> Result<i64> {
    let mut rows = connection
        .query(
            "SELECT COALESCE(MAX(version), 0) FROM schema_migrations",
            (),
        )
        .await
        .map_err(|error| AppError::Database(error.to_string()))?;

    let row = rows
        .next()
        .await
        .map_err(|error| AppError::Database(error.to_string()))?
        .ok_or_else(|| AppError::Database("schema_migrations returned no row".to_string()))?;

    row.get::<i64>(0)
        .map_err(|error| AppError::Database(error.to_string()))
}
