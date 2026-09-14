use serde::{Deserialize, Serialize};

use crate::error::{AppError, Result};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum MediaType {
    Movie,
    Tv,
}

impl MediaType {
    pub fn as_str(self) -> &'static str {
        match self {
            MediaType::Movie => "movie",
            MediaType::Tv => "tv",
        }
    }

    pub fn parse(value: &str) -> Result<Self> {
        match value {
            "movie" => Ok(MediaType::Movie),
            "tv" => Ok(MediaType::Tv),
            other => Err(AppError::Metadata(format!(
                "unsupported media type '{other}'"
            ))),
        }
    }
}

#[derive(Debug, Clone)]
pub struct MediaItem {
    pub id: String,
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
}

#[derive(Debug, Clone)]
pub struct Season {
    pub id: String,
    pub media_item_id: String,
    pub season_number: i64,
    pub name: String,
    pub overview: Option<String>,
    pub poster_path: Option<String>,
    pub air_date: Option<String>,
}

#[derive(Debug, Clone)]
pub struct Episode {
    pub id: String,
    pub season_id: String,
    pub media_item_id: String,
    pub episode_number: i64,
    pub name: String,
    pub overview: Option<String>,
    pub still_path: Option<String>,
    pub air_date: Option<String>,
    pub runtime: Option<i64>,
}
