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
    let config = state.config();
    let database = state.database().await?;
    let sync = state.sync_manager().clone();
    run(&database, &sync, &config.device_id).await?;
    Ok(status_for(&state))
}

#[tauri::command]
pub fn get_sync_status(state: State<'_, AppState>) -> SyncStatus {
    status_for(&state)
}

#[tauri::command]
pub async fn set_online_state(
    state: State<'_, AppState>,
    online: bool,
    session: String,
    seq: u64,
) -> Result<()> {
    let Some(was_online) = state.sync_manager().set_online(online, &session, seq) else {
        return Ok(());
    };
    if online && !was_online && state.sync_manager().is_dirty() {
        state.trigger_sync().await;
    }
    Ok(())
}
