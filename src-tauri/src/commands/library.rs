use std::collections::HashMap;

use serde::Serialize;
use tauri::State;

use crate::db::repositories::{
    episode as episode_repo, media_item as media_repo, season as season_repo,
};
use crate::domain::{Episode, MediaItem, MediaType};
use crate::error::{AppError, Result};
use crate::services::tmdb::{backdrop_url, poster_url};
use crate::state::AppState;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WatchProgress {
    pub position_seconds: i64,
    pub duration_seconds: i64,
    pub watched: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MediaSummary {
    pub id: String,
    #[serde(rename = "type")]
    pub media_type: MediaType,
    pub title: String,
    pub year: Option<i64>,
    pub poster_url: Option<String>,
    pub progress: Option<WatchProgress>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EpisodeDetail {
    pub id: String,
    pub episode_number: i64,
    pub name: String,
    pub overview: Option<String>,
    pub air_date: Option<String>,
    pub runtime_minutes: Option<i64>,
    pub file_linked: bool,
    pub progress: Option<WatchProgress>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SeasonDetail {
    pub id: String,
    pub season_number: i64,
    pub name: String,
    pub episodes: Vec<EpisodeDetail>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MediaDetail {
    pub id: String,
    #[serde(rename = "type")]
    pub media_type: MediaType,
    pub title: String,
    pub year: Option<i64>,
    pub overview: Option<String>,
    pub poster_url: Option<String>,
    pub backdrop_url: Option<String>,
    pub release_date: Option<String>,
    pub runtime_minutes: Option<i64>,
    pub genres: Vec<String>,
    pub progress: Option<WatchProgress>,
    pub seasons: Vec<SeasonDetail>,
}

fn year_from_date(date: Option<&str>) -> Option<i64> {
    date?.get(..4)?.parse().ok()
}

fn preferred_date(item: &MediaItem) -> Option<&str> {
    item.release_date
        .as_deref()
        .or(item.first_air_date.as_deref())
}

fn summary_from(item: MediaItem) -> MediaSummary {
    let year = year_from_date(preferred_date(&item));
    MediaSummary {
        id: item.id,
        media_type: item.media_type,
        title: item.title,
        year,
        poster_url: poster_url(item.poster_path.as_deref()),
        progress: None,
    }
}

fn episode_detail(episode: Episode) -> EpisodeDetail {
    EpisodeDetail {
        id: episode.id,
        episode_number: episode.episode_number,
        name: episode.name,
        overview: episode.overview,
        air_date: episode.air_date,
        runtime_minutes: episode.runtime,
        file_linked: false,
        progress: None,
    }
}

#[tauri::command]
pub async fn list_media(state: State<'_, AppState>) -> Result<Vec<MediaSummary>> {
    let connection = state.database().await?.connect()?;
    let items = media_repo::list_all(&connection).await?;
    Ok(items.into_iter().map(summary_from).collect())
}

#[tauri::command]
pub async fn get_media(state: State<'_, AppState>, media_id: String) -> Result<MediaDetail> {
    let connection = state.database().await?.connect()?;
    let item = media_repo::find_by_id(&connection, &media_id)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("media item {media_id}")))?;

    let seasons = season_repo::list_for_media(&connection, &media_id).await?;
    let episodes = episode_repo::list_for_media(&connection, &media_id).await?;

    let mut episodes_by_season: HashMap<String, Vec<Episode>> = HashMap::new();
    for episode in episodes {
        episodes_by_season
            .entry(episode.season_id.clone())
            .or_default()
            .push(episode);
    }

    let season_details = seasons
        .into_iter()
        .map(|season| {
            let episodes = episodes_by_season.remove(&season.id).unwrap_or_default();
            SeasonDetail {
                id: season.id,
                season_number: season.season_number,
                name: season.name,
                episodes: episodes.into_iter().map(episode_detail).collect(),
            }
        })
        .collect();

    let MediaItem {
        id,
        media_type,
        title,
        overview,
        poster_path,
        backdrop_path,
        release_date,
        first_air_date,
        runtime,
        ..
    } = item;
    let date = release_date.as_deref().or(first_air_date.as_deref());

    Ok(MediaDetail {
        id,
        media_type,
        title,
        year: year_from_date(date),
        overview,
        poster_url: poster_url(poster_path.as_deref()),
        backdrop_url: backdrop_url(backdrop_path.as_deref()),
        release_date: date.map(str::to_string),
        runtime_minutes: runtime,
        genres: Vec::new(),
        progress: None,
        seasons: season_details,
    })
}
