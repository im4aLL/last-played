use turso::Connection;

use crate::error::{AppError, Result};

pub struct Migration {
    pub version: i64,
    pub name: &'static str,
    pub sql: &'static str,
}

const CREATE_MEDIA_TABLES: &str = "
CREATE TABLE media_item (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN ('movie', 'tv')),
    tmdb_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    original_title TEXT,
    overview TEXT,
    poster_path TEXT,
    backdrop_path TEXT,
    release_date TEXT,
    first_air_date TEXT,
    runtime INTEGER,
    status TEXT,
    added_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE (type, tmdb_id)
);

CREATE TABLE season (
    id TEXT PRIMARY KEY,
    media_item_id TEXT NOT NULL REFERENCES media_item(id) ON DELETE CASCADE,
    season_number INTEGER NOT NULL,
    name TEXT NOT NULL,
    overview TEXT,
    poster_path TEXT,
    air_date TEXT,
    UNIQUE (media_item_id, season_number)
);

CREATE TABLE episode (
    id TEXT PRIMARY KEY,
    season_id TEXT NOT NULL REFERENCES season(id) ON DELETE CASCADE,
    media_item_id TEXT NOT NULL REFERENCES media_item(id) ON DELETE CASCADE,
    episode_number INTEGER NOT NULL,
    name TEXT NOT NULL,
    overview TEXT,
    still_path TEXT,
    air_date TEXT,
    runtime INTEGER,
    UNIQUE (season_id, episode_number)
);
";

pub const MIGRATIONS: &[Migration] = &[Migration {
    version: 1,
    name: "create_media_tables",
    sql: CREATE_MEDIA_TABLES,
}];

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
