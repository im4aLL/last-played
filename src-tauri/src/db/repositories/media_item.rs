use turso::{params::Params, Connection, Row, Value};

use crate::domain::{MediaItem, MediaType, WatchProgress};
use crate::error::{AppError, Result};

const COLUMNS: &str = "id, type, tmdb_id, title, original_title, overview, poster_path, backdrop_path, release_date, first_air_date, runtime, status, vote_average";

fn from_row(row: &Row) -> Result<MediaItem> {
    let media_type: String = row.get(1)?;
    Ok(MediaItem {
        id: row.get(0)?,
        media_type: MediaType::parse(&media_type)?,
        tmdb_id: row.get(2)?,
        title: row.get(3)?,
        original_title: row.get(4)?,
        overview: row.get(5)?,
        poster_path: row.get(6)?,
        backdrop_path: row.get(7)?,
        release_date: row.get(8)?,
        first_air_date: row.get(9)?,
        runtime: row.get(10)?,
        status: row.get(11)?,
        vote_average: row.get(12)?,
    })
}

pub async fn insert(conn: &Connection, item: &MediaItem) -> Result<()> {
    conn.execute(
        "INSERT INTO media_item (
            id, type, tmdb_id, title, original_title, overview, poster_path,
            backdrop_path, release_date, first_air_date, runtime, status,
            vote_average, added_at, updated_at
        ) VALUES (
            ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13,
            strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
            strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
        )",
        (
            item.id.as_str(),
            item.media_type.as_str(),
            item.tmdb_id,
            item.title.as_str(),
            item.original_title.as_deref(),
            item.overview.as_deref(),
            item.poster_path.as_deref(),
            item.backdrop_path.as_deref(),
            item.release_date.as_deref(),
            item.first_air_date.as_deref(),
            item.runtime,
            item.status.as_deref(),
            item.vote_average,
        ),
    )
    .await
    .map_err(AppError::from)?;
    Ok(())
}

pub async fn update(conn: &Connection, item: &MediaItem) -> Result<()> {
    conn.execute(
        "UPDATE media_item SET
            type = ?2, tmdb_id = ?3, title = ?4, original_title = ?5,
            overview = ?6, poster_path = ?7, backdrop_path = ?8,
            release_date = ?9, first_air_date = ?10, runtime = ?11, status = ?12,
            vote_average = ?13,
            updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
        WHERE id = ?1",
        (
            item.id.as_str(),
            item.media_type.as_str(),
            item.tmdb_id,
            item.title.as_str(),
            item.original_title.as_deref(),
            item.overview.as_deref(),
            item.poster_path.as_deref(),
            item.backdrop_path.as_deref(),
            item.release_date.as_deref(),
            item.first_air_date.as_deref(),
            item.runtime,
            item.status.as_deref(),
            item.vote_average,
        ),
    )
    .await
    .map_err(AppError::from)?;
    Ok(())
}

pub async fn find_by_id(conn: &Connection, id: &str) -> Result<Option<MediaItem>> {
    let mut rows = conn
        .query(
            &format!("SELECT {COLUMNS} FROM media_item WHERE id = ?1"),
            (id,),
        )
        .await
        .map_err(AppError::from)?;

    match rows.next().await.map_err(AppError::from)? {
        Some(row) => Ok(Some(from_row(&row)?)),
        None => Ok(None),
    }
}

pub async fn list_all(conn: &Connection) -> Result<Vec<MediaItem>> {
    let mut rows = conn
        .query(
            &format!(
                "SELECT {COLUMNS} FROM media_item ORDER BY added_at DESC, title COLLATE NOCASE ASC"
            ),
            (),
        )
        .await
        .map_err(AppError::from)?;

    let mut items = Vec::new();
    while let Some(row) = rows.next().await.map_err(AppError::from)? {
        items.push(from_row(&row)?);
    }

    Ok(items)
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum MediaTypeFilter {
    All,
    Movie,
    Tv,
}

impl MediaTypeFilter {
    pub fn parse(value: &str) -> Result<Self> {
        match value {
            "" | "all" => Ok(MediaTypeFilter::All),
            "movie" => Ok(MediaTypeFilter::Movie),
            "tv" => Ok(MediaTypeFilter::Tv),
            other => Err(AppError::Metadata(format!(
                "unsupported media type filter '{other}'"
            ))),
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum WatchFilter {
    All,
    Unwatched,
    InProgress,
    Watched,
}

impl WatchFilter {
    pub fn parse(value: &str) -> Result<Self> {
        match value {
            "" | "all" => Ok(WatchFilter::All),
            "unwatched" => Ok(WatchFilter::Unwatched),
            "in-progress" => Ok(WatchFilter::InProgress),
            "watched" => Ok(WatchFilter::Watched),
            other => Err(AppError::Metadata(format!(
                "unsupported watch filter '{other}'"
            ))),
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum LibrarySort {
    Recent,
    Title,
}

impl LibrarySort {
    pub fn parse(value: &str) -> Result<Self> {
        match value {
            "" | "recent" => Ok(LibrarySort::Recent),
            "title" => Ok(LibrarySort::Title),
            other => Err(AppError::Metadata(format!(
                "unsupported library sort '{other}'"
            ))),
        }
    }
}

#[derive(Debug, Clone)]
pub struct LibraryQuery {
    pub search: Option<String>,
    pub media_type: MediaTypeFilter,
    pub watch: WatchFilter,
    pub sort: LibrarySort,
}

#[derive(Debug, Clone)]
pub struct MediaWithProgress {
    pub item: MediaItem,
    pub progress: Option<WatchProgress>,
}

/// One row per media item with its effective progress: a movie's own row, or a
/// show's most recently watched in-progress episode. Matches the semantics the
/// dashboard previously derived in Rust.
const EFFECTIVE_CTE: &str = "WITH effective AS (
    SELECT
        m.id AS media_id,
        wp.episode_id AS episode_id,
        wp.position_seconds AS position_seconds,
        wp.duration_seconds AS duration_seconds,
        wp.watched AS watched
    FROM media_item m
    LEFT JOIN watch_progress wp ON wp.target_id = (
        CASE
            WHEN m.type = 'movie' THEN m.id
            ELSE (
                SELECT wp2.target_id
                FROM watch_progress wp2
                WHERE wp2.media_item_id = m.id
                    AND wp2.episode_id IS NOT NULL
                    AND wp2.watched = 0
                    AND wp2.position_seconds > 0
                ORDER BY wp2.updated_at DESC
                LIMIT 1
            )
        END
    )
)";

const LIST_COLUMNS: &str = "m.id, m.type, m.tmdb_id, m.title, m.original_title, m.overview, m.poster_path, m.backdrop_path, m.release_date, m.first_air_date, m.runtime, m.status, m.vote_average, e.episode_id, e.position_seconds, e.duration_seconds, e.watched";

const EFFECTIVE_FROM: &str = "FROM media_item m JOIN effective e ON e.media_id = m.id";

fn escape_like(value: &str) -> String {
    value
        .replace('\\', "\\\\")
        .replace('%', "\\%")
        .replace('_', "\\_")
}

fn build_where(query: &LibraryQuery) -> (String, Vec<Value>) {
    let mut conditions: Vec<&str> = Vec::new();
    let mut params: Vec<Value> = Vec::new();

    match query.media_type {
        MediaTypeFilter::Movie => {
            conditions.push("m.type = ?");
            params.push(Value::Text(MediaType::Movie.as_str().to_string()));
        }
        MediaTypeFilter::Tv => {
            conditions.push("m.type = ?");
            params.push(Value::Text(MediaType::Tv.as_str().to_string()));
        }
        MediaTypeFilter::All => {}
    }

    match query.watch {
        WatchFilter::Watched => conditions.push("e.watched = 1"),
        WatchFilter::InProgress => conditions.push("e.watched = 0 AND e.position_seconds > 0"),
        WatchFilter::Unwatched => conditions
            .push("(e.watched IS NULL OR (e.watched = 0 AND COALESCE(e.position_seconds, 0) <= 0))"),
        WatchFilter::All => {}
    }

    let search = query
        .search
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty());
    if let Some(search) = search {
        conditions.push(r"m.title LIKE ? ESCAPE '\'");
        params.push(Value::Text(format!("%{}%", escape_like(search))));
    }

    let clause = if conditions.is_empty() {
        String::new()
    } else {
        format!(" WHERE {}", conditions.join(" AND "))
    };
    (clause, params)
}

fn from_row_with_progress(row: &Row) -> Result<MediaWithProgress> {
    let item = from_row(row)?;
    let episode_id: Option<String> = row.get(13)?;
    let position_seconds: Option<f64> = row.get(14)?;
    let duration_seconds: Option<f64> = row.get(15)?;
    let watched: Option<i64> = row.get(16)?;

    let progress = watched.map(|watched| WatchProgress {
        media_item_id: item.id.clone(),
        episode_id,
        position_seconds: position_seconds.unwrap_or(0.0),
        duration_seconds: duration_seconds.unwrap_or(0.0),
        watched: watched != 0,
    });

    Ok(MediaWithProgress { item, progress })
}

/// Filter, sort, and page the library entirely in SQL so partial pages never
/// under-report matches. Returns the page plus the total match count.
pub async fn list_page(
    conn: &Connection,
    query: &LibraryQuery,
    limit: i64,
    offset: i64,
) -> Result<(Vec<MediaWithProgress>, i64)> {
    let (where_clause, params) = build_where(query);

    let count_sql = format!("{EFFECTIVE_CTE} SELECT COUNT(*) {EFFECTIVE_FROM}{where_clause}");
    let mut count_rows = conn
        .query(&count_sql, Params::Positional(params.clone()))
        .await
        .map_err(AppError::from)?;
    let total: i64 = match count_rows.next().await.map_err(AppError::from)? {
        Some(row) => row.get(0)?,
        None => 0,
    };

    let order = match query.sort {
        LibrarySort::Recent => "ORDER BY m.added_at DESC, m.title COLLATE NOCASE ASC, m.id ASC",
        LibrarySort::Title => "ORDER BY m.title COLLATE NOCASE ASC, m.id ASC",
    };
    let list_sql = format!(
        "{EFFECTIVE_CTE} SELECT {LIST_COLUMNS} {EFFECTIVE_FROM}{where_clause} {order} LIMIT ? OFFSET ?"
    );

    let mut list_params = params;
    list_params.push(Value::Integer(limit));
    list_params.push(Value::Integer(offset));

    let mut rows = conn
        .query(&list_sql, Params::Positional(list_params))
        .await
        .map_err(AppError::from)?;

    let mut items = Vec::new();
    while let Some(row) = rows.next().await.map_err(AppError::from)? {
        items.push(from_row_with_progress(&row)?);
    }

    Ok((items, total))
}

pub async fn find_by_tmdb(
    conn: &Connection,
    media_type: MediaType,
    tmdb_id: i64,
) -> Result<Option<MediaItem>> {
    let mut rows = conn
        .query(
            &format!("SELECT {COLUMNS} FROM media_item WHERE type = ?1 AND tmdb_id = ?2"),
            (media_type.as_str(), tmdb_id),
        )
        .await
        .map_err(AppError::from)?;

    match rows.next().await.map_err(AppError::from)? {
        Some(row) => Ok(Some(from_row(&row)?)),
        None => Ok(None),
    }
}
