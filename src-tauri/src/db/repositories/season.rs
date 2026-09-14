use turso::Connection;

use crate::domain::Season;
use crate::error::{AppError, Result};

pub async fn insert(conn: &Connection, season: &Season) -> Result<()> {
    conn.execute(
        "INSERT INTO season (
            id, media_item_id, season_number, name, overview, poster_path, air_date
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        (
            season.id.as_str(),
            season.media_item_id.as_str(),
            season.season_number,
            season.name.as_str(),
            season.overview.as_deref(),
            season.poster_path.as_deref(),
            season.air_date.as_deref(),
        ),
    )
    .await
    .map_err(AppError::from)?;
    Ok(())
}

pub async fn update(conn: &Connection, season: &Season) -> Result<()> {
    conn.execute(
        "UPDATE season SET
            season_number = ?2, name = ?3, overview = ?4, poster_path = ?5,
            air_date = ?6
        WHERE id = ?1",
        (
            season.id.as_str(),
            season.season_number,
            season.name.as_str(),
            season.overview.as_deref(),
            season.poster_path.as_deref(),
            season.air_date.as_deref(),
        ),
    )
    .await
    .map_err(AppError::from)?;
    Ok(())
}

pub async fn find_id(
    conn: &Connection,
    media_item_id: &str,
    season_number: i64,
) -> Result<Option<String>> {
    let mut rows = conn
        .query(
            "SELECT id FROM season WHERE media_item_id = ?1 AND season_number = ?2",
            (media_item_id, season_number),
        )
        .await
        .map_err(AppError::from)?;

    match rows.next().await.map_err(AppError::from)? {
        Some(row) => Ok(Some(row.get(0)?)),
        None => Ok(None),
    }
}
