use turso::{Connection, Row};

use crate::domain::{MediaItem, MediaType};
use crate::error::{AppError, Result};

const COLUMNS: &str = "id, type, tmdb_id, title, original_title, overview, poster_path, backdrop_path, release_date, first_air_date, runtime, status";

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
    })
}

pub async fn insert(conn: &Connection, item: &MediaItem) -> Result<()> {
    conn.execute(
        "INSERT INTO media_item (
            id, type, tmdb_id, title, original_title, overview, poster_path,
            backdrop_path, release_date, first_air_date, runtime, status,
            added_at, updated_at
        ) VALUES (
            ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12,
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
