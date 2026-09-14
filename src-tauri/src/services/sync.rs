use std::collections::HashMap;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use serde::Serialize;
use tauri::{AppHandle, Manager};
use turso::{params::Params, Connection, Value};

use crate::config::DbMode;
use crate::db::Database;
use crate::error::{AppError, Result};
use crate::services::remote::RemoteClient;
use crate::state::AppState;

const SYNC_INTERVAL: Duration = Duration::from_secs(30);

/// Columns and identity for a table that participates in sync.
struct TableSync {
    name: &'static str,
    columns: &'static [&'static str],
    primary_key: &'static [&'static str],
    /// Column used for last-write-wins. `None` means "insert if missing only".
    updated_at: Option<&'static str>,
}

const DEVICE_TABLE: TableSync = TableSync {
    name: "device",
    columns: &["id", "name", "platform", "last_seen_at"],
    primary_key: &["id"],
    updated_at: None,
};

const MEDIA_ITEM_TABLE: TableSync = TableSync {
    name: "media_item",
    columns: &[
        "id",
        "type",
        "tmdb_id",
        "title",
        "original_title",
        "overview",
        "poster_path",
        "backdrop_path",
        "release_date",
        "first_air_date",
        "runtime",
        "status",
        "added_at",
        "updated_at",
    ],
    primary_key: &["id"],
    updated_at: Some("updated_at"),
};

const SEASON_TABLE: TableSync = TableSync {
    name: "season",
    columns: &[
        "id",
        "media_item_id",
        "season_number",
        "name",
        "overview",
        "poster_path",
        "air_date",
    ],
    primary_key: &["id"],
    updated_at: None,
};

const EPISODE_TABLE: TableSync = TableSync {
    name: "episode",
    columns: &[
        "id",
        "season_id",
        "media_item_id",
        "episode_number",
        "name",
        "overview",
        "still_path",
        "air_date",
        "runtime",
    ],
    primary_key: &["id"],
    updated_at: None,
};

const WATCH_PROGRESS_TABLE: TableSync = TableSync {
    name: "watch_progress",
    columns: &[
        "target_id",
        "media_item_id",
        "episode_id",
        "position_seconds",
        "duration_seconds",
        "watched",
        "updated_at",
    ],
    primary_key: &["target_id"],
    updated_at: Some("updated_at"),
};

/// Parent tables first so foreign keys resolve on both sides.
const SYNCED_TABLES: &[TableSync] = &[
    DEVICE_TABLE,
    MEDIA_ITEM_TABLE,
    SEASON_TABLE,
    EPISODE_TABLE,
    WATCH_PROGRESS_TABLE,
];

const VIDEO_FILE_COLUMNS: &[&str] = &[
    "id",
    "media_item_id",
    "episode_id",
    "device_id",
    "path",
    "size_bytes",
    "mtime",
    "container",
    "added_at",
];

/// Order used when creating remote tables (video_file last: it references the rest).
const SCHEMA_TABLE_ORDER: &[&str] = &[
    "device",
    "media_item",
    "season",
    "episode",
    "watch_progress",
    "video_file",
];

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum SyncState {
    Idle,
    Syncing,
    Error,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncStatus {
    pub enabled: bool,
    pub state: SyncState,
    pub last_synced_at: Option<i64>,
    pub error: Option<String>,
    pub pending: bool,
}

#[derive(Debug, Clone)]
struct RuntimeState {
    state: SyncState,
    last_synced_at: Option<i64>,
    error: Option<String>,
}

impl Default for RuntimeState {
    fn default() -> Self {
        Self {
            state: SyncState::Idle,
            last_synced_at: None,
            error: None,
        }
    }
}

#[derive(Clone, Default)]
pub struct SyncManager {
    inner: Arc<SyncInner>,
}

#[derive(Default)]
struct SyncInner {
    running: AtomicBool,
    dirty: AtomicBool,
    runtime: Mutex<RuntimeState>,
}

impl SyncManager {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn mark_dirty(&self) {
        self.inner.dirty.store(true, Ordering::SeqCst);
    }

    pub fn is_dirty(&self) -> bool {
        self.inner.dirty.load(Ordering::SeqCst)
    }

    fn clear_dirty(&self) {
        self.inner.dirty.store(false, Ordering::SeqCst);
    }

    fn begin(&self) -> bool {
        self.inner
            .running
            .compare_exchange(false, true, Ordering::SeqCst, Ordering::SeqCst)
            .is_ok()
    }

    fn end(&self) {
        self.inner.running.store(false, Ordering::SeqCst);
    }

    fn set_running(&self) {
        let mut runtime = self.lock();
        runtime.state = SyncState::Syncing;
        runtime.error = None;
    }

    fn finish_ok(&self) {
        let mut runtime = self.lock();
        runtime.state = SyncState::Idle;
        runtime.error = None;
        runtime.last_synced_at = Some(now_millis());
    }

    fn finish_err(&self, message: &str) {
        let mut runtime = self.lock();
        runtime.state = SyncState::Error;
        runtime.error = Some(message.to_string());
    }

    pub fn snapshot(&self, enabled: bool) -> SyncStatus {
        let runtime = self.lock().clone();
        SyncStatus {
            enabled,
            state: runtime.state,
            last_synced_at: runtime.last_synced_at,
            error: runtime.error,
            pending: self.is_dirty(),
        }
    }

    fn lock(&self) -> std::sync::MutexGuard<'_, RuntimeState> {
        self.inner
            .runtime
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner())
    }
}

pub async fn run(database: &Database, sync: &SyncManager, device_id: &str) -> Result<()> {
    let Some(remote) = database.remote() else {
        return Ok(());
    };

    if !sync.begin() {
        sync.mark_dirty();
        return Ok(());
    }

    sync.set_running();
    let result = sync_once(database, remote, device_id).await;
    sync.end();

    match result {
        Ok(()) => {
            sync.clear_dirty();
            sync.finish_ok();
            Ok(())
        }
        Err(error) => {
            // Keep the change queued so the next tick retries after a transient failure.
            sync.mark_dirty();
            sync.finish_err(&error.to_string());
            Err(error)
        }
    }
}

async fn sync_once(database: &Database, remote: &RemoteClient, device_id: &str) -> Result<()> {
    let connection = database.connect().await?;

    apply_remote_schema(&connection, remote).await?;
    for table in SYNCED_TABLES {
        reconcile_table(&connection, remote, table).await?;
    }
    reconcile_device_video_files(&connection, remote, device_id).await?;

    Ok(())
}

/// Creates any missing remote tables and indexes from the local schema.
///
/// Reading `sqlite_master` keeps the remote schema in step with migrations
/// without duplicating the DDL in a second list.
async fn apply_remote_schema(connection: &Connection, remote: &RemoteClient) -> Result<()> {
    let synced: Vec<&str> = SCHEMA_TABLE_ORDER.to_vec();

    let mut rows = connection
        .query(
            "SELECT type, tbl_name, sql FROM sqlite_master
             WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%'",
            (),
        )
        .await
        .map_err(db_error)?;

    let mut tables: HashMap<String, String> = HashMap::new();
    let mut indexes: Vec<String> = Vec::new();

    while let Some(row) = rows.next().await.map_err(db_error)? {
        let kind: String = row.get(0).map_err(db_error)?;
        let table: String = row.get(1).map_err(db_error)?;
        let sql: String = row.get(2).map_err(db_error)?;

        if !synced.contains(&table.as_str()) {
            continue;
        }

        match kind.as_str() {
            "table" => {
                tables.insert(table, with_if_not_exists(&sql, "CREATE TABLE"));
            }
            "index" => indexes.push(with_if_not_exists(&sql, "CREATE INDEX")),
            _ => {}
        }
    }

    for name in SCHEMA_TABLE_ORDER {
        if let Some(statement) = tables.get(*name) {
            remote.execute(statement, &[]).await?;
        }
    }
    for statement in indexes {
        remote.execute(&statement, &[]).await?;
    }

    Ok(())
}

fn with_if_not_exists(sql: &str, prefix: &str) -> String {
    if sql.contains("IF NOT EXISTS") {
        return sql.to_string();
    }
    sql.replacen(prefix, &format!("{prefix} IF NOT EXISTS"), 1)
}

/// Reconciles one table with last-write-wins on its `updated_at` column.
///
/// Both sides are read before anything is written, so the comparison uses a
/// consistent snapshot. Rows missing on one side are inserted; rows present on
/// both sides are updated only when the newer `updated_at` wins.
async fn reconcile_table(
    connection: &Connection,
    remote: &RemoteClient,
    table: &TableSync,
) -> Result<()> {
    let columns = table.columns.join(", ");
    let local_rows = read_local(connection, table).await?;
    let remote_rows = remote
        .select(&format!("SELECT {columns} FROM {}", table.name), &[])
        .await?;

    let local_by_key = index_by_key(&local_rows, table)?;
    let remote_by_key = index_by_key(&remote_rows, table)?;

    // Pull: remote -> local.
    for (key, remote_row) in &remote_by_key {
        match local_by_key.get(key) {
            None => insert_local(connection, table, remote_row).await?,
            Some(local_row) => {
                if is_remote_newer(table, remote_row, local_row)? {
                    update_local(connection, table, remote_row).await?;
                }
            }
        }
    }

    // Push: local -> remote.
    for (key, local_row) in &local_by_key {
        match remote_by_key.get(key) {
            None => insert_remote(remote, table, local_row).await?,
            Some(remote_row) => {
                if is_local_newer(table, local_row, remote_row)? {
                    update_remote(remote, table, local_row).await?;
                }
            }
        }
    }

    Ok(())
}

async fn read_local(connection: &Connection, table: &TableSync) -> Result<Vec<Vec<Value>>> {
    let columns = table.columns.join(", ");
    let mut rows = connection
        .query(&format!("SELECT {columns} FROM {}", table.name), ())
        .await
        .map_err(db_error)?;

    let mut result = Vec::new();
    while let Some(row) = rows.next().await.map_err(db_error)? {
        let mut values = Vec::with_capacity(table.columns.len());
        for index in 0..table.columns.len() {
            values.push(row.get_value(index).map_err(db_error)?);
        }
        result.push(values);
    }

    Ok(result)
}

fn index_by_key(rows: &[Vec<Value>], table: &TableSync) -> Result<HashMap<String, Vec<Value>>> {
    let mut map = HashMap::with_capacity(rows.len());
    for row in rows {
        map.insert(primary_key(row, table)?, row.clone());
    }
    Ok(map)
}

fn primary_key(row: &[Value], table: &TableSync) -> Result<String> {
    let mut key = String::new();
    for (position, column) in table.primary_key.iter().enumerate() {
        if position > 0 {
            key.push('\u{1f}');
        }
        let index = column_index(table, column)?;
        key.push_str(&value_to_string(&row[index]));
    }
    Ok(key)
}

fn is_remote_newer(table: &TableSync, remote: &[Value], local: &[Value]) -> Result<bool> {
    is_newer(table, remote, local)
}

fn is_local_newer(table: &TableSync, local: &[Value], remote: &[Value]) -> Result<bool> {
    is_newer(table, local, remote)
}

fn is_newer(table: &TableSync, candidate: &[Value], current: &[Value]) -> Result<bool> {
    let Some(column) = table.updated_at else {
        return Ok(false);
    };
    let index = column_index(table, column)?;
    Ok(value_to_string(&candidate[index]) > value_to_string(&current[index]))
}

async fn insert_local(connection: &Connection, table: &TableSync, row: &[Value]) -> Result<()> {
    let statement = insert_statement(table, true);
    connection
        .execute(&statement, Params::Positional(row.to_vec()))
        .await
        .map_err(db_error)?;
    Ok(())
}

async fn update_local(connection: &Connection, table: &TableSync, row: &[Value]) -> Result<()> {
    let (statement, order) = update_statement(table, true)?;
    connection
        .execute(&statement, Params::Positional(pick(row, &order)))
        .await
        .map_err(db_error)?;
    Ok(())
}

async fn insert_remote(remote: &RemoteClient, table: &TableSync, row: &[Value]) -> Result<()> {
    let statement = insert_statement(table, false);
    remote.execute(&statement, row).await
}

async fn update_remote(remote: &RemoteClient, table: &TableSync, row: &[Value]) -> Result<()> {
    let (statement, order) = update_statement(table, false)?;
    remote.execute(&statement, &pick(row, &order)).await
}

/// Mirrors this device's file links to the remote database.
///
/// File links are device-local: only this device's rows are pushed, and remote
/// rows that were unlinked locally are deleted. Other devices' rows are never
/// pulled, so another machine's paths simply show as unlinked here.
async fn reconcile_device_video_files(
    connection: &Connection,
    remote: &RemoteClient,
    device_id: &str,
) -> Result<()> {
    let columns = VIDEO_FILE_COLUMNS.join(", ");
    let mut rows = connection
        .query(
            &format!("SELECT {columns} FROM video_file WHERE device_id = ?1"),
            (device_id,),
        )
        .await
        .map_err(db_error)?;

    let mut local_rows: Vec<Vec<Value>> = Vec::new();
    while let Some(row) = rows.next().await.map_err(db_error)? {
        let mut values = Vec::with_capacity(VIDEO_FILE_COLUMNS.len());
        for index in 0..VIDEO_FILE_COLUMNS.len() {
            values.push(row.get_value(index).map_err(db_error)?);
        }
        local_rows.push(values);
    }

    let remote_rows = remote
        .select(
            &format!("SELECT {columns} FROM video_file WHERE device_id = ?"),
            &[Value::Text(device_id.to_string())],
        )
        .await?;

    let local_ids: Vec<String> = local_rows
        .iter()
        .map(|row| value_to_string(&row[0]))
        .collect();
    let remote_ids: Vec<String> = remote_rows
        .iter()
        .map(|row| value_to_string(&row[0]))
        .collect();

    for remote_row in &remote_rows {
        let id = value_to_string(&remote_row[0]);
        if !local_ids.contains(&id) {
            remote
                .execute("DELETE FROM video_file WHERE id = ?", &[Value::Text(id)])
                .await?;
        }
    }

    for local_row in &local_rows {
        let id = value_to_string(&local_row[0]);
        if !remote_ids.contains(&id) {
            let statement = format!(
                "INSERT OR IGNORE INTO video_file ({columns}) VALUES ({})",
                remote_placeholders(VIDEO_FILE_COLUMNS.len())
            );
            remote.execute(&statement, local_row).await?;
        }
    }

    Ok(())
}

fn insert_statement(table: &TableSync, numbered: bool) -> String {
    format!(
        "INSERT OR IGNORE INTO {} ({}) VALUES ({})",
        table.name,
        table.columns.join(", "),
        placeholders(table.columns.len(), numbered)
    )
}

/// Returns the SQL plus the row indexes to bind, in placeholder order:
/// non-primary-key columns (SET) followed by primary-key columns (WHERE).
fn update_statement(table: &TableSync, numbered: bool) -> Result<(String, Vec<usize>)> {
    let mut order = Vec::new();
    let mut counter = 0usize;
    let next = |counter: &mut usize| -> String {
        *counter += 1;
        if numbered {
            format!("?{counter}")
        } else {
            "?".to_string()
        }
    };

    let mut set_parts = Vec::new();
    for column in table.columns {
        if table.primary_key.contains(column) {
            continue;
        }
        order.push(column_index(table, column)?);
        set_parts.push(format!("{column} = {}", next(&mut counter)));
    }

    let mut where_parts = Vec::new();
    for column in table.primary_key {
        order.push(column_index(table, column)?);
        where_parts.push(format!("{column} = {}", next(&mut counter)));
    }

    let statement = format!(
        "UPDATE {} SET {} WHERE {}",
        table.name,
        set_parts.join(", "),
        where_parts.join(" AND ")
    );
    Ok((statement, order))
}

fn placeholders(count: usize, numbered: bool) -> String {
    (1..=count)
        .map(|index| {
            if numbered {
                format!("?{index}")
            } else {
                "?".to_string()
            }
        })
        .collect::<Vec<_>>()
        .join(", ")
}

fn remote_placeholders(count: usize) -> String {
    placeholders(count, false)
}

fn pick(row: &[Value], order: &[usize]) -> Vec<Value> {
    order.iter().map(|index| row[*index].clone()).collect()
}

fn column_index(table: &TableSync, column: &str) -> Result<usize> {
    table
        .columns
        .iter()
        .position(|candidate| *candidate == column)
        .ok_or_else(|| AppError::Database(format!("table {} has no column {column}", table.name)))
}

fn value_to_string(value: &Value) -> String {
    match value {
        Value::Null => String::new(),
        Value::Integer(number) => number.to_string(),
        Value::Real(number) => number.to_string(),
        Value::Text(text) => text.clone(),
        Value::Blob(bytes) => bytes.iter().map(|byte| format!("{byte:02x}")).collect(),
    }
}

fn db_error(error: turso::Error) -> AppError {
    AppError::Database(error.to_string())
}

pub async fn background_loop(app: AppHandle) {
    let mut ticker = tokio::time::interval(SYNC_INTERVAL);
    loop {
        ticker.tick().await;

        let state = app.state::<AppState>();
        let config = state.config();
        if config.db_mode != Some(DbMode::Remote) {
            continue;
        }

        let Ok(database) = state.database().await else {
            continue;
        };
        let sync = state.sync_manager().clone();
        if let Err(error) = run(&database, &sync, &config.device_id).await {
            eprintln!("background sync failed: {error}");
        }
    }
}

fn now_millis() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis() as i64)
        .unwrap_or(0)
}
