use turso::{Connection, Row};

use crate::domain::VideoFile;
use crate::error::{AppError, Result};

const COLUMNS: &str =
    "id, media_item_id, episode_id, device_id, path, size_bytes, mtime, container";

fn from_row(row: &Row) -> Result<VideoFile> {
    Ok(VideoFile {
        id: row.get(0)?,
        media_item_id: row.get(1)?,
        episode_id: row.get(2)?,
        device_id: row.get(3)?,
        path: row.get(4)?,
        size_bytes: row.get(5)?,
        mtime: row.get(6)?,
        container: row.get(7)?,
    })
}

pub async fn insert(conn: &Connection, file: &VideoFile) -> Result<()> {
    conn.execute(
        "INSERT INTO video_file (
            id, media_item_id, episode_id, device_id, path, size_bytes, mtime,
            container, added_at
        ) VALUES (
            ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8,
            strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
        )",
        (
            file.id.as_str(),
            file.media_item_id.as_str(),
            file.episode_id.as_deref(),
            file.device_id.as_str(),
            file.path.as_str(),
            file.size_bytes,
            file.mtime,
            file.container.as_deref(),
        ),
    )
    .await
    .map_err(AppError::from)?;
    Ok(())
}

pub async fn replace_for_target(conn: &Connection, file: &VideoFile) -> Result<()> {
    delete_for_target(
        conn,
        &file.device_id,
        &file.media_item_id,
        file.episode_id.as_deref(),
    )
    .await?;
    delete_by_path(conn, &file.device_id, &file.path).await?;
    insert(conn, file).await
}

async fn delete_for_target(
    conn: &Connection,
    device_id: &str,
    media_item_id: &str,
    episode_id: Option<&str>,
) -> Result<()> {
    conn.execute(
        "DELETE FROM video_file
         WHERE device_id = ?1 AND media_item_id = ?2 AND episode_id IS ?3",
        (device_id, media_item_id, episode_id),
    )
    .await
    .map_err(AppError::from)?;
    Ok(())
}

async fn delete_by_path(conn: &Connection, device_id: &str, path: &str) -> Result<()> {
    conn.execute(
        "DELETE FROM video_file WHERE device_id = ?1 AND path = ?2",
        (device_id, path),
    )
    .await
    .map_err(AppError::from)?;
    Ok(())
}

pub async fn delete(conn: &Connection, id: &str, device_id: &str) -> Result<()> {
    conn.execute(
        "DELETE FROM video_file WHERE id = ?1 AND device_id = ?2",
        (id, device_id),
    )
    .await
    .map_err(AppError::from)?;
    Ok(())
}

pub async fn list_for_media(
    conn: &Connection,
    media_item_id: &str,
    device_id: &str,
) -> Result<Vec<VideoFile>> {
    let mut rows = conn
        .query(
            &format!(
                "SELECT {COLUMNS} FROM video_file
                 WHERE media_item_id = ?1 AND device_id = ?2
                 ORDER BY added_at ASC"
            ),
            (media_item_id, device_id),
        )
        .await
        .map_err(AppError::from)?;

    let mut files = Vec::new();
    while let Some(row) = rows.next().await.map_err(AppError::from)? {
        files.push(from_row(&row)?);
    }

    Ok(files)
}
