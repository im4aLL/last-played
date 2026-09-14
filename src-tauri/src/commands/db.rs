use serde::Serialize;

use crate::config::DbMode;
use crate::error::Result;
use crate::state::AppState;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DatabaseHealth {
    pub mode: Option<DbMode>,
    pub path: Option<String>,
    pub schema_version: i64,
}

pub async fn health_for(state: &AppState) -> Result<DatabaseHealth> {
    let config = state.config();
    let Some(mode) = config.db_mode else {
        return Ok(DatabaseHealth {
            mode: None,
            path: None,
            schema_version: 0,
        });
    };

    let database = state.database().await?;
    let schema_version = database.schema_version().await?;

    Ok(DatabaseHealth {
        mode: Some(mode),
        path: Some(state.db_path().to_string_lossy().into_owned()),
        schema_version,
    })
}

#[tauri::command]
pub async fn get_health(state: tauri::State<'_, AppState>) -> Result<DatabaseHealth> {
    health_for(&state).await
}

#[tauri::command]
pub async fn test_db_connection(state: tauri::State<'_, AppState>) -> Result<DatabaseHealth> {
    let database = state.database().await?;
    if let Some(remote) = database.remote() {
        remote.select("SELECT 1", &[]).await?;
    } else {
        let connection = database.connect().await?;
        connection
            .query("SELECT 1", ())
            .await
            .map_err(|error| crate::error::AppError::Database(error.to_string()))?;
    }

    health_for(&state).await
}
