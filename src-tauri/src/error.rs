use serde::{Serialize, Serializer};

pub type Result<T> = std::result::Result<T, AppError>;

#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("config error: {0}")]
    Config(String),
    #[error("database error: {0}")]
    Database(String),
    #[error("metadata error: {0}")]
    Metadata(String),
    #[error("tmdb error: {0}")]
    Tmdb(String),
    #[error("not found: {0}")]
    NotFound(String),
    #[error(transparent)]
    Io(#[from] std::io::Error),
    #[error(transparent)]
    Json(#[from] serde_json::Error),
}

impl From<turso::Error> for AppError {
    fn from(error: turso::Error) -> Self {
        AppError::Database(error.to_string())
    }
}

impl Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}
