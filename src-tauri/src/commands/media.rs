use serde::Serialize;
use tauri::State;
use turso::transaction::{Transaction, TransactionBehavior};
use uuid::Uuid;

use crate::db::repositories::{
    episode as episode_repo, media_item as media_repo, season as season_repo,
};
use crate::domain::{Episode, MediaItem, MediaType, Season};
use crate::error::{AppError, Result};
use crate::services::tmdb::{
    backdrop_url, poster_url, still_url, MediaMetadata, SeasonMetadata, TmdbClient,
    TmdbSearchResult,
};
use crate::state::AppState;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EpisodePreview {
    pub episode_number: i64,
    pub name: String,
    pub overview: Option<String>,
    pub still_url: Option<String>,
    pub air_date: Option<String>,
    pub runtime: Option<i64>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SeasonPreview {
    pub season_number: i64,
    pub name: String,
    pub overview: Option<String>,
    pub poster_url: Option<String>,
    pub air_date: Option<String>,
    pub episode_count: i64,
    pub episodes: Vec<EpisodePreview>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MediaPreview {
    pub tmdb_id: i64,
    pub media_type: MediaType,
    pub title: String,
    pub year: Option<i64>,
    pub overview: Option<String>,
    pub poster_url: Option<String>,
    pub backdrop_url: Option<String>,
    pub release_date: Option<String>,
    pub runtime: Option<i64>,
    pub season_count: i64,
    pub episode_count: i64,
    pub seasons: Vec<SeasonPreview>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AddedMedia {
    pub id: String,
    pub media_type: MediaType,
    pub title: String,
    pub year: Option<i64>,
    pub poster_url: Option<String>,
    pub season_count: i64,
    pub episode_count: i64,
    pub refreshed: bool,
}

impl SeasonPreview {
    fn from_metadata(season: &SeasonMetadata) -> Self {
        Self {
            season_number: season.season_number,
            name: season.name.clone(),
            overview: season.overview.clone(),
            poster_url: poster_url(season.poster_path.as_deref()),
            air_date: season.air_date.clone(),
            episode_count: season.episodes.len() as i64,
            episodes: season
                .episodes
                .iter()
                .map(|episode| EpisodePreview {
                    episode_number: episode.episode_number,
                    name: episode.name.clone(),
                    overview: episode.overview.clone(),
                    still_url: still_url(episode.still_path.as_deref()),
                    air_date: episode.air_date.clone(),
                    runtime: episode.runtime,
                })
                .collect(),
        }
    }
}

impl MediaPreview {
    fn from_metadata(metadata: &MediaMetadata) -> Self {
        Self {
            tmdb_id: metadata.tmdb_id,
            media_type: metadata.media_type,
            title: metadata.title.clone(),
            year: year_from_metadata(metadata),
            overview: metadata.overview.clone(),
            poster_url: poster_url(metadata.poster_path.as_deref()),
            backdrop_url: backdrop_url(metadata.backdrop_path.as_deref()),
            release_date: preferred_date(metadata).map(str::to_string),
            runtime: metadata.runtime,
            season_count: metadata.seasons.len() as i64,
            episode_count: metadata
                .seasons
                .iter()
                .map(|season| season.episodes.len() as i64)
                .sum(),
            seasons: metadata
                .seasons
                .iter()
                .map(SeasonPreview::from_metadata)
                .collect(),
        }
    }
}

fn preferred_date(metadata: &MediaMetadata) -> Option<&str> {
    metadata
        .release_date
        .as_deref()
        .or(metadata.first_air_date.as_deref())
}

fn year_from_metadata(metadata: &MediaMetadata) -> Option<i64> {
    let date = preferred_date(metadata)?;
    if date.len() < 4 {
        return None;
    }
    date[..4].parse().ok()
}

fn client(state: &AppState) -> Result<TmdbClient> {
    let api_key = state.config().tmdb_api_key;
    if api_key.trim().is_empty() {
        return Err(AppError::Config(
            "Add your TMDB API key in Settings before adding media.".to_string(),
        ));
    }
    TmdbClient::new(api_key)
}

#[tauri::command]
pub async fn search_tmdb(
    state: State<'_, AppState>,
    query: String,
) -> Result<Vec<TmdbSearchResult>> {
    let query = query.trim();
    if query.is_empty() {
        return Ok(Vec::new());
    }
    client(&state)?.search(query).await
}

#[tauri::command]
pub async fn preview_tmdb_media(
    state: State<'_, AppState>,
    media_type: MediaType,
    tmdb_id: i64,
) -> Result<MediaPreview> {
    let metadata = client(&state)?.fetch_metadata(media_type, tmdb_id).await?;
    Ok(MediaPreview::from_metadata(&metadata))
}

#[tauri::command]
pub async fn add_media_from_tmdb(
    state: State<'_, AppState>,
    media_type: MediaType,
    tmdb_id: i64,
) -> Result<AddedMedia> {
    let metadata = client(&state)?.fetch_metadata(media_type, tmdb_id).await?;
    persist(&state, &metadata).await
}

#[tauri::command]
pub async fn refresh_metadata(state: State<'_, AppState>, media_id: String) -> Result<AddedMedia> {
    let database = state.database().await?;
    let connection = database.connect().await?;
    let item = media_repo::find_by_id(&connection, &media_id)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("media item {media_id}")))?;

    let metadata = client(&state)?
        .fetch_metadata(item.media_type, item.tmdb_id)
        .await?;
    persist(&state, &metadata).await
}

async fn persist(state: &AppState, metadata: &MediaMetadata) -> Result<AddedMedia> {
    let database = state.database().await?;
    let connection = database.connect().await?;
    let transaction =
        Transaction::new_unchecked(&connection, TransactionBehavior::Immediate).await?;

    let existing =
        media_repo::find_by_tmdb(&transaction, metadata.media_type, metadata.tmdb_id).await?;
    let refreshed = existing.is_some();
    let media_id = existing
        .map(|item| item.id)
        .unwrap_or_else(|| Uuid::new_v4().to_string());

    let media = MediaItem {
        id: media_id.clone(),
        media_type: metadata.media_type,
        tmdb_id: metadata.tmdb_id,
        title: metadata.title.clone(),
        original_title: metadata.original_title.clone(),
        overview: metadata.overview.clone(),
        poster_path: metadata.poster_path.clone(),
        backdrop_path: metadata.backdrop_path.clone(),
        release_date: metadata.release_date.clone(),
        first_air_date: metadata.first_air_date.clone(),
        runtime: metadata.runtime,
        status: metadata.status.clone(),
        vote_average: metadata.vote_average,
    };

    if refreshed {
        media_repo::update(&transaction, &media).await?;
    } else {
        media_repo::insert(&transaction, &media).await?;
    }

    let mut episode_count = 0_i64;
    for season_metadata in &metadata.seasons {
        let existing_season =
            season_repo::find_id(&transaction, &media_id, season_metadata.season_number).await?;
        let season_id = existing_season
            .clone()
            .unwrap_or_else(|| Uuid::new_v4().to_string());

        let season = Season {
            id: season_id.clone(),
            media_item_id: media_id.clone(),
            season_number: season_metadata.season_number,
            name: season_metadata.name.clone(),
            overview: season_metadata.overview.clone(),
            poster_path: season_metadata.poster_path.clone(),
            air_date: season_metadata.air_date.clone(),
        };

        if existing_season.is_some() {
            season_repo::update(&transaction, &season).await?;
        } else {
            season_repo::insert(&transaction, &season).await?;
        }

        for episode_metadata in &season_metadata.episodes {
            let existing_episode =
                episode_repo::find_id(&transaction, &season_id, episode_metadata.episode_number)
                    .await?;
            let episode_id = existing_episode
                .clone()
                .unwrap_or_else(|| Uuid::new_v4().to_string());

            let episode = Episode {
                id: episode_id,
                season_id: season_id.clone(),
                media_item_id: media_id.clone(),
                episode_number: episode_metadata.episode_number,
                name: episode_metadata.name.clone(),
                overview: episode_metadata.overview.clone(),
                still_path: episode_metadata.still_path.clone(),
                air_date: episode_metadata.air_date.clone(),
                runtime: episode_metadata.runtime,
            };

            if existing_episode.is_some() {
                episode_repo::update(&transaction, &episode).await?;
            } else {
                episode_repo::insert(&transaction, &episode).await?;
            }
            episode_count += 1;
        }
    }

    transaction.commit().await?;
    state.trigger_sync().await;

    Ok(AddedMedia {
        id: media_id,
        media_type: metadata.media_type,
        title: metadata.title.clone(),
        year: year_from_metadata(metadata),
        poster_url: poster_url(metadata.poster_path.as_deref()),
        season_count: metadata.seasons.len() as i64,
        episode_count,
        refreshed,
    })
}
