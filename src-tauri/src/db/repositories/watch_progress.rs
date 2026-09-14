use turso::{Connection, Row};

use crate::domain::WatchProgress;
use crate::error::{AppError, Result};

const COLUMNS: &str = "media_item_id, episode_id, position_seconds, duration_seconds, watched";

fn from_row(row: &Row) -> Result<WatchProgress> {
    Ok(WatchProgress {
        media_item_id: row.get(0)?,
        episode_id: row.get(1)?,
        position_seconds: row.get(2)?,
        duration_seconds: row.get(3)?,
        watched: row.get::<i64>(4)? != 0,
    })
}

pub fn target_id<'a>(media_item_id: &'a str, episode_id: Option<&'a str>) -> &'a str {
    episode_id.unwrap_or(media_item_id)
}

pub async fn find(
    conn: &Connection,
    media_item_id: &str,
    episode_id: Option<&str>,
) -> Result<Option<WatchProgress>> {
    let mut rows = conn
        .query(
            &format!("SELECT {COLUMNS} FROM watch_progress WHERE target_id = ?1"),
            (target_id(media_item_id, episode_id),),
        )
        .await
        .map_err(AppError::from)?;

    match rows.next().await.map_err(AppError::from)? {
        Some(row) => Ok(Some(from_row(&row)?)),
        None => Ok(None),
    }
}

pub async fn upsert(conn: &Connection, progress: &WatchProgress) -> Result<()> {
    conn.execute(
        "INSERT INTO watch_progress (
            target_id, media_item_id, episode_id, position_seconds,
            duration_seconds, watched, updated_at
        ) VALUES (
            ?1, ?2, ?3, ?4, ?5, ?6,
            strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
        )
        ON CONFLICT(target_id) DO UPDATE SET
            media_item_id = excluded.media_item_id,
            episode_id = excluded.episode_id,
            position_seconds = excluded.position_seconds,
            duration_seconds = excluded.duration_seconds,
            watched = excluded.watched,
            updated_at = excluded.updated_at",
        (
            progress.target_id(),
            progress.media_item_id.as_str(),
            progress.episode_id.as_deref(),
            progress.position_seconds,
            progress.duration_seconds,
            i64::from(progress.watched),
        ),
    )
    .await
    .map_err(AppError::from)?;
    Ok(())
}

pub async fn list_all(conn: &Connection) -> Result<Vec<WatchProgress>> {
    let mut rows = conn
        .query(
            &format!("SELECT {COLUMNS} FROM watch_progress ORDER BY updated_at DESC"),
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

pub async fn list_for_media(conn: &Connection, media_item_id: &str) -> Result<Vec<WatchProgress>> {
    let mut rows = conn
        .query(
            &format!(
                "SELECT {COLUMNS} FROM watch_progress
                 WHERE media_item_id = ?1
                 ORDER BY updated_at DESC"
            ),
            (media_item_id,),
        )
        .await
        .map_err(AppError::from)?;

    let mut items = Vec::new();
    while let Some(row) = rows.next().await.map_err(AppError::from)? {
        items.push(from_row(&row)?);
    }

    Ok(items)
}

/// Progress rows that should surface in "Continue Watching": started but not
/// finished, newest first. Callers dedupe per media item.
pub async fn list_in_progress(conn: &Connection, limit: i64) -> Result<Vec<WatchProgress>> {
    let mut rows = conn
        .query(
            &format!(
                "SELECT {COLUMNS} FROM watch_progress
                 WHERE watched = 0 AND position_seconds > 0
                 ORDER BY updated_at DESC
                 LIMIT ?1"
            ),
            (limit,),
        )
        .await
        .map_err(AppError::from)?;

    let mut items = Vec::new();
    while let Some(row) = rows.next().await.map_err(AppError::from)? {
        items.push(from_row(&row)?);
    }

    Ok(items)
}
