use std::path::Path;

use serde::Serialize;
use tauri::State;
use uuid::Uuid;

use crate::db::repositories::{
    episode as episode_repo, media_item as media_repo, video_file as video_file_repo,
};
use crate::domain::{MediaType, VideoFile};
use crate::error::{AppError, Result};
use crate::state::AppState;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct VideoFileInfo {
    pub id: String,
    pub path: String,
    pub file_name: String,
    pub size_bytes: Option<i64>,
    pub mtime: Option<i64>,
    pub container: Option<String>,
}

impl From<VideoFile> for VideoFileInfo {
    fn from(file: VideoFile) -> Self {
        let file_name = Path::new(&file.path)
            .file_name()
            .map(|name| name.to_string_lossy().into_owned())
            .unwrap_or_else(|| file.path.clone());
        Self {
            id: file.id,
            path: file.path,
            file_name,
            size_bytes: file.size_bytes,
            mtime: file.mtime,
            container: file.container,
        }
    }
}

fn probe_file(path: &str) -> Result<(Option<i64>, Option<i64>, Option<String>)> {
    let metadata = std::fs::metadata(path)?;
    let size_bytes = i64::try_from(metadata.len()).ok();
    let mtime = metadata
        .modified()
        .ok()
        .and_then(|time| time.duration_since(std::time::UNIX_EPOCH).ok())
        .map(|duration| duration.as_millis() as i64);
    let container = Path::new(path)
        .extension()
        .and_then(|extension| extension.to_str())
        .map(str::to_ascii_lowercase);
    Ok((size_bytes, mtime, container))
}

async fn link_file(
    state: &AppState,
    media_item_id: &str,
    episode_id: Option<&str>,
    path: &str,
) -> Result<VideoFileInfo> {
    if path.trim().is_empty() {
        return Err(AppError::Metadata("No file was selected.".to_string()));
    }

    let (size_bytes, mtime, container) = probe_file(path)?;
    let database = state.database().await?;
    let connection = database.connect()?;

    let file = VideoFile {
        id: Uuid::new_v4().to_string(),
        media_item_id: media_item_id.to_string(),
        episode_id: episode_id.map(str::to_string),
        device_id: state.config().device_id,
        path: path.to_string(),
        size_bytes,
        mtime,
        container,
    };

    video_file_repo::replace_for_target(&connection, &file).await?;
    Ok(file.into())
}

#[tauri::command]
pub async fn link_movie_file(
    state: State<'_, AppState>,
    media_id: String,
    path: String,
) -> Result<VideoFileInfo> {
    let database = state.database().await?;
    let connection = database.connect()?;
    let item = media_repo::find_by_id(&connection, &media_id)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("media item {media_id}")))?;

    if item.media_type != MediaType::Movie {
        return Err(AppError::Metadata(
            "Only movies can be linked with link_movie_file.".to_string(),
        ));
    }

    link_file(&state, &media_id, None, &path).await
}

#[tauri::command]
pub async fn link_episode_file(
    state: State<'_, AppState>,
    episode_id: String,
    path: String,
) -> Result<VideoFileInfo> {
    let database = state.database().await?;
    let connection = database.connect()?;
    let episode = episode_repo::find_by_id(&connection, &episode_id)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("episode {episode_id}")))?;

    link_file(&state, &episode.media_item_id, Some(&episode.id), &path).await
}

#[tauri::command]
pub async fn unlink_video_file(state: State<'_, AppState>, video_file_id: String) -> Result<()> {
    let database = state.database().await?;
    let connection = database.connect()?;
    video_file_repo::delete(&connection, &video_file_id, &state.config().device_id).await
}
