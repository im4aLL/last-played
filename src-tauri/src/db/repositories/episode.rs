use turso::{Connection, Row};

use crate::domain::Episode;
use crate::error::{AppError, Result};

const COLUMNS: &str =
    "id, season_id, media_item_id, episode_number, name, overview, still_path, air_date, runtime";

fn from_row(row: &Row) -> Result<Episode> {
    Ok(Episode {
        id: row.get(0)?,
        season_id: row.get(1)?,
        media_item_id: row.get(2)?,
        episode_number: row.get(3)?,
        name: row.get(4)?,
        overview: row.get(5)?,
        still_path: row.get(6)?,
        air_date: row.get(7)?,
        runtime: row.get(8)?,
    })
}

pub async fn insert(conn: &Connection, episode: &Episode) -> Result<()> {
    conn.execute(
        "INSERT INTO episode (
            id, season_id, media_item_id, episode_number, name, overview,
            still_path, air_date, runtime
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
        (
            episode.id.as_str(),
            episode.season_id.as_str(),
            episode.media_item_id.as_str(),
            episode.episode_number,
            episode.name.as_str(),
            episode.overview.as_deref(),
            episode.still_path.as_deref(),
            episode.air_date.as_deref(),
            episode.runtime,
        ),
    )
    .await
    .map_err(AppError::from)?;
    Ok(())
}

pub async fn update(conn: &Connection, episode: &Episode) -> Result<()> {
    conn.execute(
        "UPDATE episode SET
            episode_number = ?2, name = ?3, overview = ?4, still_path = ?5,
            air_date = ?6, runtime = ?7
        WHERE id = ?1",
        (
            episode.id.as_str(),
            episode.episode_number,
            episode.name.as_str(),
            episode.overview.as_deref(),
            episode.still_path.as_deref(),
            episode.air_date.as_deref(),
            episode.runtime,
        ),
    )
    .await
    .map_err(AppError::from)?;
    Ok(())
}

pub async fn list_for_media(conn: &Connection, media_item_id: &str) -> Result<Vec<Episode>> {
    let mut rows = conn
        .query(
            &format!(
                "SELECT {COLUMNS} FROM episode WHERE media_item_id = ?1 ORDER BY episode_number ASC"
            ),
            (media_item_id,),
        )
        .await
        .map_err(AppError::from)?;

    let mut episodes = Vec::new();
    while let Some(row) = rows.next().await.map_err(AppError::from)? {
        episodes.push(from_row(&row)?);
    }

    Ok(episodes)
}

pub async fn find_by_id(conn: &Connection, id: &str) -> Result<Option<Episode>> {
    let mut rows = conn
        .query(
            &format!("SELECT {COLUMNS} FROM episode WHERE id = ?1"),
            (id,),
        )
        .await
        .map_err(AppError::from)?;

    match rows.next().await.map_err(AppError::from)? {
        Some(row) => Ok(Some(from_row(&row)?)),
        None => Ok(None),
    }
}

pub async fn find_id(
    conn: &Connection,
    season_id: &str,
    episode_number: i64,
) -> Result<Option<String>> {
    let mut rows = conn
        .query(
            "SELECT id FROM episode WHERE season_id = ?1 AND episode_number = ?2",
            (season_id, episode_number),
        )
        .await
        .map_err(AppError::from)?;

    match rows.next().await.map_err(AppError::from)? {
        Some(row) => Ok(Some(row.get(0)?)),
        None => Ok(None),
    }
}
