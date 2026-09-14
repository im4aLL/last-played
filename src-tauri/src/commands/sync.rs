use tauri::State;

use crate::config::DbMode;
use crate::error::Result;
use crate::services::sync::{run, SyncStatus};
use crate::state::AppState;

fn status_for(state: &AppState) -> SyncStatus {
    let enabled = state.config().db_mode == Some(DbMode::Remote);
    state.sync_manager().snapshot(enabled)
}

#[tauri::command]
pub async fn sync_now(state: State<'_, AppState>) -> Result<SyncStatus> {
    let database = state.database().await?;
    let sync = state.sync_manager().clone();
    run(&database, &sync, true).await?;
    Ok(status_for(&state))
}

#[tauri::command]
pub fn get_sync_status(state: State<'_, AppState>) -> SyncStatus {
    status_for(&state)
}
