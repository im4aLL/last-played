use turso::Connection;

use crate::error::{AppError, Result};

pub async fn register(conn: &Connection, id: &str, name: &str, platform: &str) -> Result<()> {
    conn.execute(
        "INSERT INTO device (id, name, platform, last_seen_at)
         VALUES (?1, ?2, ?3, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
         ON CONFLICT(id) DO UPDATE SET
            name = excluded.name,
            platform = excluded.platform,
            last_seen_at = excluded.last_seen_at",
        (id, name, platform),
    )
    .await
    .map_err(AppError::from)?;
    Ok(())
}
