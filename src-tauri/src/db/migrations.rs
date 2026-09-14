use turso::Connection;

use crate::error::{AppError, Result};

pub struct Migration {
    pub version: i64,
    pub name: &'static str,
    /// Statements are run one at a time so a failure points at the exact DDL.
    pub statements: &'static [&'static str],
}

const CREATE_MEDIA_TABLES: &[&str] = &[
    "CREATE TABLE media_item (
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
)",
    "CREATE TABLE season (
    id TEXT PRIMARY KEY,
    media_item_id TEXT NOT NULL REFERENCES media_item(id) ON DELETE CASCADE,
    season_number INTEGER NOT NULL,
    name TEXT NOT NULL,
    overview TEXT,
    poster_path TEXT,
    air_date TEXT,
    UNIQUE (media_item_id, season_number)
)",
    "CREATE TABLE episode (
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
)",
];

const CREATE_LINKING_TABLES: &[&str] = &[
    "CREATE TABLE device (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    platform TEXT NOT NULL,
    last_seen_at TEXT NOT NULL
)",
    "CREATE TABLE video_file (
    id TEXT PRIMARY KEY,
    media_item_id TEXT NOT NULL REFERENCES media_item(id) ON DELETE CASCADE,
    episode_id TEXT REFERENCES episode(id) ON DELETE CASCADE,
    device_id TEXT NOT NULL REFERENCES device(id) ON DELETE CASCADE,
    path TEXT NOT NULL,
    size_bytes INTEGER,
    mtime INTEGER,
    container TEXT,
    added_at TEXT NOT NULL,
    UNIQUE (device_id, path)
)",
    "CREATE INDEX video_file_media_item_id_idx ON video_file (media_item_id)",
    "CREATE INDEX video_file_episode_id_idx ON video_file (episode_id)",
];

const CREATE_WATCH_PROGRESS_TABLE: &[&str] = &[
    "CREATE TABLE watch_progress (
    target_id TEXT PRIMARY KEY,
    media_item_id TEXT NOT NULL REFERENCES media_item(id) ON DELETE CASCADE,
    episode_id TEXT REFERENCES episode(id) ON DELETE CASCADE,
    position_seconds REAL NOT NULL DEFAULT 0,
    duration_seconds REAL NOT NULL DEFAULT 0,
    watched INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL
)",
    "CREATE INDEX watch_progress_media_item_id_idx ON watch_progress (media_item_id)",
    "CREATE INDEX watch_progress_episode_id_idx ON watch_progress (episode_id)",
];

pub const MIGRATIONS: &[Migration] = &[
    Migration {
        version: 1,
        name: "create_media_tables",
        statements: CREATE_MEDIA_TABLES,
    },
    Migration {
        version: 2,
        name: "create_linking_tables",
        statements: CREATE_LINKING_TABLES,
    },
    Migration {
        version: 3,
        name: "create_watch_progress",
        statements: CREATE_WATCH_PROGRESS_TABLE,
    },
];

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
        for statement in migration.statements {
            connection
                .execute(*statement, ())
                .await
                .map_err(|error| AppError::Database(error.to_string()))?;
        }

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
