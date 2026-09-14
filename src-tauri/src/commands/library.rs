use std::collections::HashMap;

use serde::{Deserialize, Serialize};
use tauri::State;

use crate::commands::linking::VideoFileInfo;
use crate::db::repositories::{
    episode as episode_repo,
    media_item::{
        self as media_repo, LibraryQuery, LibrarySort, MediaTypeFilter, WatchFilter,
    },
    season as season_repo, video_file as video_file_repo, watch_progress as watch_repo,
};
use crate::domain::{Episode, MediaItem, MediaType, VideoFile, WatchProgress};
use crate::error::{AppError, Result};
use crate::services::tmdb::{backdrop_url, poster_url, still_url};
use crate::state::AppState;

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
pub struct MediaPage {
    pub items: Vec<MediaSummary>,
    pub total: i64,
}

/// Raw filter payload from the UI. Empty strings fall back to the "all" /
/// "recent" defaults so partially specified filters stay valid.
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LibraryFilterInput {
    #[serde(default)]
    pub query: String,
    #[serde(default, rename = "type")]
    pub media_type: String,
    #[serde(default)]
    pub watch: String,
    #[serde(default)]
    pub sort: String,
}

impl LibraryFilterInput {
    fn into_query(self) -> Result<LibraryQuery> {
        let search = self.query.trim();
        Ok(LibraryQuery {
            search: (!search.is_empty()).then(|| search.to_string()),
            media_type: MediaTypeFilter::parse(&self.media_type)?,
            watch: WatchFilter::parse(&self.watch)?,
            sort: LibrarySort::parse(&self.sort)?,
        })
    }
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EpisodeDetail {
    pub id: String,
    pub episode_number: i64,
    pub name: String,
    pub overview: Option<String>,
    pub still_url: Option<String>,
    pub air_date: Option<String>,
    pub runtime_minutes: Option<i64>,
    pub file_linked: bool,
    pub video_file: Option<VideoFileInfo>,
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
pub struct ResumePoint {
    pub episode_id: String,
    pub season_number: i64,
    pub episode_number: i64,
    pub name: String,
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
    pub vote_average: Option<f64>,
    pub genres: Vec<String>,
    pub progress: Option<WatchProgress>,
    pub resume: Option<ResumePoint>,
    pub video_file: Option<VideoFileInfo>,
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

pub(crate) fn summary_from(item: MediaItem, progress: Option<WatchProgress>) -> MediaSummary {
    let year = year_from_date(preferred_date(&item));
    MediaSummary {
        id: item.id,
        media_type: item.media_type,
        title: item.title,
        year,
        poster_url: poster_url(item.poster_path.as_deref()),
        progress,
    }
}

fn episode_detail(
    episode: Episode,
    video_file: Option<VideoFile>,
    progress: Option<WatchProgress>,
) -> EpisodeDetail {
    let file_linked = video_file.is_some();
    EpisodeDetail {
        id: episode.id,
        episode_number: episode.episode_number,
        name: episode.name,
        overview: episode.overview,
        still_url: still_url(episode.still_path.as_deref()),
        air_date: episode.air_date,
        runtime_minutes: episode.runtime,
        file_linked,
        video_file: video_file.map(VideoFileInfo::from),
        progress,
    }
}

/// The progress a poster or card should show for a media item: the movie's own
/// progress, or for a show the most recently watched in-progress episode.
/// Rows arrive newest-first, so the first match wins.
fn progress_for_media(rows: &[WatchProgress], item: &MediaItem) -> Option<WatchProgress> {
    match item.media_type {
        MediaType::Movie => rows.iter().find(|row| row.episode_id.is_none()).cloned(),
        MediaType::Tv => rows
            .iter()
            .find(|row| row.episode_id.is_some() && !row.watched && row.position_seconds > 0.0)
            .cloned(),
    }
}

const MAX_PAGE_SIZE: i64 = 200;

#[tauri::command]
pub async fn list_media(
    state: State<'_, AppState>,
    filter: LibraryFilterInput,
    limit: i64,
    offset: i64,
) -> Result<MediaPage> {
    let connection = state.database().await?.connect().await?;
    let query = filter.into_query()?;
    let limit = limit.clamp(1, MAX_PAGE_SIZE);
    let offset = offset.max(0);

    let (rows, total) = media_repo::list_page(&connection, &query, limit, offset).await?;

    let items = rows
        .into_iter()
        .map(|row| summary_from(row.item, row.progress))
        .collect();

    Ok(MediaPage { items, total })
}

#[tauri::command]
pub async fn get_media(state: State<'_, AppState>, media_id: String) -> Result<MediaDetail> {
    let connection = state.database().await?.connect().await?;
    let item = media_repo::find_by_id(&connection, &media_id)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("media item {media_id}")))?;

    let seasons = season_repo::list_for_media(&connection, &media_id).await?;
    let episodes = episode_repo::list_for_media(&connection, &media_id).await?;
    let files =
        video_file_repo::list_for_media(&connection, &media_id, &state.config().device_id).await?;

    let progress_rows = watch_repo::list_for_media(&connection, &media_id).await?;
    // Drives the hero's Resume label: a movie's own progress, or a show's most
    // recently watched in-progress episode.
    let media_progress = progress_for_media(&progress_rows, &item);
    let resume = progress_rows
        .iter()
        .find(|row| row.episode_id.is_some() && !row.watched && row.position_seconds > 0.0)
        .and_then(|row| {
            let episode_id = row.episode_id.as_deref()?;
            let episode = episodes.iter().find(|episode| episode.id == episode_id)?;
            let season = seasons
                .iter()
                .find(|season| season.id == episode.season_id)?;
            Some(ResumePoint {
                episode_id: episode.id.clone(),
                season_number: season.season_number,
                episode_number: episode.episode_number,
                name: episode.name.clone(),
            })
        });
    let mut progress: HashMap<String, WatchProgress> = progress_rows
        .into_iter()
        .map(|row| (row.target_id().to_string(), row))
        .collect();

    let mut files_by_episode: HashMap<String, VideoFile> = HashMap::new();
    let mut movie_file: Option<VideoFile> = None;
    for file in files {
        match &file.episode_id {
            Some(episode_id) => {
                files_by_episode.insert(episode_id.clone(), file);
            }
            None => movie_file = Some(file),
        }
    }

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
                episodes: episodes
                    .into_iter()
                    .map(|episode| {
                        let file = files_by_episode.remove(&episode.id);
                        let episode_progress = progress.remove(&episode.id);
                        episode_detail(episode, file, episode_progress)
                    })
                    .collect(),
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
        vote_average,
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
        vote_average,
        genres: Vec::new(),
        progress: media_progress,
        resume,
        video_file: movie_file.map(VideoFileInfo::from),
        seasons: season_details,
    })
}
