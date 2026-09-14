use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use serde::Serialize;
use tauri::{AppHandle, Manager};

use crate::config::DbMode;
use crate::db::Database;
use crate::error::Result;
use crate::state::AppState;

const SYNC_INTERVAL: Duration = Duration::from_secs(30);

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

pub async fn run(database: &Database, sync: &SyncManager, force_push: bool) -> Result<()> {
    if !database.is_remote() {
        return Ok(());
    }

    if !sync.begin() {
        sync.mark_dirty();
        return Ok(());
    }

    sync.set_running();
    let result = sync_once(database, sync, force_push).await;
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

async fn sync_once(database: &Database, sync: &SyncManager, force_push: bool) -> Result<()> {
    // Last write wins per row: push local changes first, then apply remote ones.
    if force_push || sync.is_dirty() {
        database.push().await?;
    }
    database.pull().await?;
    Ok(())
}

pub async fn background_loop(app: AppHandle) {
    let mut ticker = tokio::time::interval(SYNC_INTERVAL);
    let mut first = true;
    loop {
        ticker.tick().await;

        let state = app.state::<AppState>();
        if state.config().db_mode != Some(DbMode::Remote) {
            first = true;
            continue;
        }

        let Ok(database) = state.database().await else {
            continue;
        };
        let sync = state.sync_manager().clone();
        let force_push = first || sync.is_dirty();
        first = false;
        if let Err(error) = run(&database, &sync, force_push).await {
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
