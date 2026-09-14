use std::time::Duration;

use serde::de::DeserializeOwned;
use serde::{Deserialize, Serialize};

use crate::domain::MediaType;
use crate::error::{AppError, Result};

const API_BASE: &str = "https://api.themoviedb.org/3";
const IMAGE_BASE: &str = "https://image.tmdb.org/t/p";
const POSTER_SIZE: &str = "w500";
const BACKDROP_SIZE: &str = "w780";
const STILL_SIZE: &str = "w300";

#[derive(Debug, Deserialize)]
struct SearchResponse {
    results: Vec<SearchResult>,
}

#[derive(Debug, Deserialize)]
struct SearchResult {
    id: i64,
    media_type: Option<String>,
    title: Option<String>,
    name: Option<String>,
    overview: Option<String>,
    poster_path: Option<String>,
    release_date: Option<String>,
    first_air_date: Option<String>,
}

#[derive(Debug, Deserialize)]
struct MovieDetails {
    id: i64,
    title: String,
    original_title: Option<String>,
    overview: Option<String>,
    poster_path: Option<String>,
    backdrop_path: Option<String>,
    release_date: Option<String>,
    runtime: Option<i64>,
    status: Option<String>,
}

#[derive(Debug, Deserialize)]
struct TvDetails {
    id: i64,
    name: String,
    original_name: Option<String>,
    overview: Option<String>,
    poster_path: Option<String>,
    backdrop_path: Option<String>,
    first_air_date: Option<String>,
    status: Option<String>,
    seasons: Option<Vec<TvSeasonSummary>>,
}

#[derive(Debug, Deserialize)]
struct TvSeasonSummary {
    season_number: i64,
}

#[derive(Debug, Deserialize)]
struct SeasonDetails {
    name: Option<String>,
    overview: Option<String>,
    poster_path: Option<String>,
    air_date: Option<String>,
    episodes: Option<Vec<SeasonEpisode>>,
}

#[derive(Debug, Deserialize)]
struct SeasonEpisode {
    episode_number: i64,
    name: Option<String>,
    overview: Option<String>,
    still_path: Option<String>,
    air_date: Option<String>,
    runtime: Option<i64>,
}

#[derive(Debug, Deserialize)]
struct ErrorResponse {
    status_message: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TmdbSearchResult {
    pub tmdb_id: i64,
    pub media_type: MediaType,
    pub title: String,
    pub year: Option<i64>,
    pub overview: Option<String>,
    pub poster_url: Option<String>,
}

#[derive(Debug, Clone)]
pub struct MediaMetadata {
    pub media_type: MediaType,
    pub tmdb_id: i64,
    pub title: String,
    pub original_title: Option<String>,
    pub overview: Option<String>,
    pub poster_path: Option<String>,
    pub backdrop_path: Option<String>,
    pub release_date: Option<String>,
    pub first_air_date: Option<String>,
    pub runtime: Option<i64>,
    pub status: Option<String>,
    pub seasons: Vec<SeasonMetadata>,
}

#[derive(Debug, Clone)]
pub struct SeasonMetadata {
    pub season_number: i64,
    pub name: String,
    pub overview: Option<String>,
    pub poster_path: Option<String>,
    pub air_date: Option<String>,
    pub episodes: Vec<EpisodeMetadata>,
}

#[derive(Debug, Clone)]
pub struct EpisodeMetadata {
    pub episode_number: i64,
    pub name: String,
    pub overview: Option<String>,
    pub still_path: Option<String>,
    pub air_date: Option<String>,
    pub runtime: Option<i64>,
}

pub struct TmdbClient {
    http: reqwest::Client,
    api_key: String,
}

impl TmdbClient {
    pub fn new(api_key: String) -> Result<Self> {
        let http = reqwest::Client::builder()
            .user_agent("LastPlayed/0.1")
            .timeout(Duration::from_secs(20))
            .build()
            .map_err(|error| AppError::Tmdb(error.to_string()))?;

        Ok(Self { http, api_key })
    }

    pub async fn search(&self, query: &str) -> Result<Vec<TmdbSearchResult>> {
        let response: SearchResponse = self
            .get_json(
                "/search/multi",
                vec![
                    ("query".to_string(), query.to_string()),
                    ("include_adult".to_string(), "false".to_string()),
                ],
            )
            .await?;

        let mut results = Vec::new();
        for result in response.results {
            let Some(media_type) = result
                .media_type
                .as_deref()
                .and_then(|value| MediaType::parse(value).ok())
            else {
                continue;
            };

            let title = result
                .title
                .or(result.name)
                .unwrap_or_else(|| "Untitled".to_string());
            let date = result.release_date.or(result.first_air_date);

            results.push(TmdbSearchResult {
                tmdb_id: result.id,
                media_type,
                title,
                year: year_from_date(date.as_deref()),
                overview: result.overview.filter(|value| !value.is_empty()),
                poster_url: image_url(result.poster_path.as_deref(), POSTER_SIZE),
            });
        }

        Ok(results)
    }

    pub async fn fetch_metadata(
        &self,
        media_type: MediaType,
        tmdb_id: i64,
    ) -> Result<MediaMetadata> {
        match media_type {
            MediaType::Movie => self.fetch_movie(tmdb_id).await,
            MediaType::Tv => self.fetch_tv(tmdb_id).await,
        }
    }

    async fn fetch_movie(&self, tmdb_id: i64) -> Result<MediaMetadata> {
        let movie: MovieDetails = self.get_json(&format!("/movie/{tmdb_id}"), vec![]).await?;

        Ok(MediaMetadata {
            media_type: MediaType::Movie,
            tmdb_id: movie.id,
            title: movie.title,
            original_title: movie.original_title,
            overview: movie.overview,
            poster_path: movie.poster_path,
            backdrop_path: movie.backdrop_path,
            release_date: movie.release_date,
            first_air_date: None,
            runtime: movie.runtime,
            status: movie.status,
            seasons: Vec::new(),
        })
    }

    async fn fetch_tv(&self, tmdb_id: i64) -> Result<MediaMetadata> {
        let details: TvDetails = self.get_json(&format!("/tv/{tmdb_id}"), vec![]).await?;

        let mut season_numbers: Vec<i64> = details
            .seasons
            .unwrap_or_default()
            .into_iter()
            .map(|season| season.season_number)
            .collect();
        season_numbers.sort_unstable();
        season_numbers.dedup();

        let mut seasons = Vec::with_capacity(season_numbers.len());
        for season_number in season_numbers {
            seasons.push(self.fetch_season(tmdb_id, season_number).await?);
        }

        Ok(MediaMetadata {
            media_type: MediaType::Tv,
            tmdb_id: details.id,
            title: details.name,
            original_title: details.original_name,
            overview: details.overview,
            poster_path: details.poster_path,
            backdrop_path: details.backdrop_path,
            release_date: None,
            first_air_date: details.first_air_date,
            runtime: None,
            status: details.status,
            seasons,
        })
    }

    async fn fetch_season(&self, tmdb_id: i64, season_number: i64) -> Result<SeasonMetadata> {
        let season: SeasonDetails = self
            .get_json(&format!("/tv/{tmdb_id}/season/{season_number}"), vec![])
            .await?;

        let mut episodes: Vec<EpisodeMetadata> = season
            .episodes
            .unwrap_or_default()
            .into_iter()
            .map(|episode| EpisodeMetadata {
                episode_number: episode.episode_number,
                name: episode
                    .name
                    .unwrap_or_else(|| format!("Episode {}", episode.episode_number)),
                overview: episode.overview.filter(|value| !value.is_empty()),
                still_path: episode.still_path,
                air_date: episode.air_date,
                runtime: episode.runtime.filter(|value| *value > 0),
            })
            .collect();
        episodes.sort_by_key(|episode| episode.episode_number);

        Ok(SeasonMetadata {
            season_number,
            name: season
                .name
                .unwrap_or_else(|| format!("Season {season_number}")),
            overview: season.overview.filter(|value| !value.is_empty()),
            poster_path: season.poster_path,
            air_date: season.air_date,
            episodes,
        })
    }

    async fn get_json<T: DeserializeOwned>(
        &self,
        path: &str,
        mut params: Vec<(String, String)>,
    ) -> Result<T> {
        let url = format!("{API_BASE}{path}");
        let mut request = self.http.get(&url);

        if self.is_bearer_token() {
            request = request.bearer_auth(self.api_key.trim());
        } else {
            params.push(("api_key".to_string(), self.api_key.trim().to_string()));
        }

        let response = request
            .query(&params)
            .send()
            .await
            .map_err(|error| AppError::Tmdb(error.to_string()))?;

        let status = response.status();
        if !status.is_success() {
            let body = response.text().await.unwrap_or_default();
            let message = serde_json::from_str::<ErrorResponse>(&body)
                .ok()
                .and_then(|error| error.status_message)
                .unwrap_or_else(|| format!("request failed with status {status}"));
            return Err(AppError::Tmdb(message));
        }

        response
            .json::<T>()
            .await
            .map_err(|error| AppError::Tmdb(error.to_string()))
    }

    fn is_bearer_token(&self) -> bool {
        self.api_key.trim().contains('.')
    }
}

pub fn image_url(path: Option<&str>, size: &str) -> Option<String> {
    path.filter(|value| !value.is_empty())
        .map(|value| format!("{IMAGE_BASE}/{size}{value}"))
}

pub fn poster_url(path: Option<&str>) -> Option<String> {
    image_url(path, POSTER_SIZE)
}

pub fn backdrop_url(path: Option<&str>) -> Option<String> {
    image_url(path, BACKDROP_SIZE)
}

pub fn still_url(path: Option<&str>) -> Option<String> {
    image_url(path, STILL_SIZE)
}

fn year_from_date(date: Option<&str>) -> Option<i64> {
    let date = date?;
    if date.len() < 4 {
        return None;
    }
    date[..4].parse().ok()
}
