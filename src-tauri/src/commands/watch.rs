use std::collections::HashMap;

use tauri::State;

use crate::commands::library::MediaSummary;
use crate::db::repositories::{
    episode as episode_repo, media_item as media_repo, watch_progress as watch_repo,
};
use crate::domain::{MediaItem, MediaType, WatchProgress};
use crate::error::{AppError, Result};
use crate::state::AppState;

const CONTINUE_WATCHING_LIMIT: i64 = 40;

fn normalize_episode_id(episode_id: Option<String>) -> Option<String> {
    episode_id.filter(|id| !id.trim().is_empty())
}

async fn resolve_target(
    connection: &turso::Connection,
    media_id: &str,
    episode_id: Option<&str>,
) -> Result<MediaItem> {
    let item = media_repo::find_by_id(connection, media_id)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("media item {media_id}")))?;

    match (item.media_type, episode_id) {
        (MediaType::Movie, Some(_)) => Err(AppError::Metadata(
            "A movie cannot be tracked with an episode id.".to_string(),
        )),
        (MediaType::Tv, Some(episode_id)) => {
            let episode = episode_repo::find_by_id(connection, episode_id)
                .await?
                .ok_or_else(|| AppError::NotFound(format!("episode {episode_id}")))?;
            if episode.media_item_id != media_id {
                return Err(AppError::Metadata(
                    "The episode does not belong to this media item.".to_string(),
                ));
            }
            Ok(item)
        }
        (MediaType::Tv, None) => Err(AppError::Metadata(
            "A show needs an episode id to save progress.".to_string(),
        )),
        (MediaType::Movie, None) => Ok(item),
    }
}

#[tauri::command]
pub async fn save_progress(
    state: State<'_, AppState>,
    media_id: String,
    episode_id: Option<String>,
    position_seconds: f64,
    duration_seconds: f64,
) -> Result<WatchProgress> {
    let connection = state.database().await?.connect().await?;
    let episode_id = normalize_episode_id(episode_id);
    resolve_target(&connection, &media_id, episode_id.as_deref()).await?;

    let existing = watch_repo::find(&connection, &media_id, episode_id.as_deref()).await?;
    let position_seconds = position_seconds.max(0.0);
    let duration_seconds = duration_seconds.max(0.0);
    let threshold = f64::from(state.config().player.watched_threshold) / 100.0;
    let reached_threshold =
        duration_seconds > 0.0 && position_seconds / duration_seconds >= threshold;
    let watched = reached_threshold || existing.is_some_and(|row| row.watched);

    let progress = WatchProgress {
        media_item_id: media_id,
        episode_id,
        position_seconds,
        duration_seconds,
        watched,
    };
    watch_repo::upsert(&connection, &progress).await?;
    state.trigger_sync().await;
    Ok(progress)
}

#[tauri::command]
pub async fn get_progress(
    state: State<'_, AppState>,
    media_id: String,
    episode_id: Option<String>,
) -> Result<Option<WatchProgress>> {
    let connection = state.database().await?.connect().await?;
    let episode_id = normalize_episode_id(episode_id);
    watch_repo::find(&connection, &media_id, episode_id.as_deref()).await
}

#[tauri::command]
pub async fn set_watched(
    state: State<'_, AppState>,
    media_id: String,
    episode_id: Option<String>,
    watched: bool,
) -> Result<WatchProgress> {
    let connection = state.database().await?.connect().await?;
    let episode_id = normalize_episode_id(episode_id);
    resolve_target(&connection, &media_id, episode_id.as_deref()).await?;

    let existing = watch_repo::find(&connection, &media_id, episode_id.as_deref()).await?;
    let progress = WatchProgress {
        media_item_id: media_id,
        episode_id,
        // Unwatching clears the resume point so playback starts from the top.
        position_seconds: if watched {
            existing.as_ref().map_or(0.0, |row| row.position_seconds)
        } else {
            0.0
        },
        duration_seconds: if watched {
            existing.as_ref().map_or(0.0, |row| row.duration_seconds)
        } else {
            0.0
        },
        watched,
    };
    watch_repo::upsert(&connection, &progress).await?;
    state.trigger_sync().await;
    Ok(progress)
}

#[tauri::command]
pub async fn continue_watching(state: State<'_, AppState>) -> Result<Vec<MediaSummary>> {
    let connection = state.database().await?.connect().await?;
    let rows = watch_repo::list_in_progress(&connection, CONTINUE_WATCHING_LIMIT).await?;
    let items = media_repo::list_all(&connection).await?;

    let mut by_id: HashMap<String, MediaItem> = items
        .into_iter()
        .map(|item| (item.id.clone(), item))
        .collect();

    let mut seen: Vec<String> = Vec::new();
    let mut summaries: Vec<MediaSummary> = Vec::new();
    for row in rows {
        if seen.contains(&row.media_item_id) {
            continue;
        }
        let Some(item) = by_id.remove(&row.media_item_id) else {
            continue;
        };
        seen.push(row.media_item_id.clone());
        summaries.push(crate::commands::library::summary_from(item, Some(row)));
    }

    Ok(summaries)
}
