//! Minimal Turso HTTP client.
//!
//! Remote mode keeps the local SQLite file as the working database and talks
//! to the remote database through its `/v2/pipeline` HTTP API. This avoids the
//! pre-1.0 embedded replica/sync engine while keeping the app offline-first.
//!
//! The shared HTTP client uses short per-request timeouts (5s connect,
//! 10s total) so an unreachable host fails fast instead of hanging sync,
//! and remote failures are offline-safe: callers keep the queued `dirty`
//! flag and retry on the next tick or reconnect.

use std::time::Duration;

use serde_json::{json, Value as JsonValue};
use turso::Value;

use crate::error::{AppError, Result};

pub struct RemoteClient {
    endpoint: String,
    token: String,
    http: reqwest::Client,
}

impl RemoteClient {
    pub fn new(raw_url: &str, auth_token: &str) -> Result<Self> {
        let base = normalize_url(raw_url)?;
        let http = reqwest::Client::builder()
            .connect_timeout(Duration::from_secs(5))
            .timeout(Duration::from_secs(10))
            .build()
            .map_err(|error| {
            AppError::Database(format!("could not create HTTP client: {error}"))
        })?;

        Ok(Self {
            endpoint: format!("{base}/v2/pipeline"),
            token: auth_token.trim().to_string(),
            http,
        })
    }

    pub async fn execute(&self, sql: &str, args: &[Value]) -> Result<()> {
        self.run(sql, args).await.map(|_| ())
    }

    pub async fn select(&self, sql: &str, args: &[Value]) -> Result<Vec<Vec<Value>>> {
        self.run(sql, args).await
    }

    async fn run(&self, sql: &str, args: &[Value]) -> Result<Vec<Vec<Value>>> {
        let args = args
            .iter()
            .map(value_to_json)
            .collect::<Result<Vec<JsonValue>>>()?;
        let body = json!({
            "requests": [
                { "type": "execute", "stmt": { "sql": sql, "args": args } },
                { "type": "close" }
            ]
        });

        let mut request = self.http.post(&self.endpoint).json(&body);
        if !self.token.is_empty() {
            request = request.bearer_auth(&self.token);
        }

        let response = request
            .send()
            .await
            .map_err(|error| AppError::Database(format!("remote request failed: {error}")))?;

        let status = response.status();
        let body: JsonValue = response.json().await.map_err(|error| {
            AppError::Database(format!("remote response was not valid JSON: {error}"))
        })?;

        if !status.is_success() {
            let message = error_message(&body).unwrap_or_else(|| body.to_string());
            return Err(AppError::Database(format!(
                "remote HTTP {status}: {message}"
            )));
        }

        let first = body
            .get("results")
            .and_then(|results| results.get(0))
            .ok_or_else(|| AppError::Database("remote response had no results".to_string()))?;

        if first.get("type").and_then(JsonValue::as_str) == Some("error") {
            let message =
                error_message(first).unwrap_or_else(|| "remote statement failed".to_string());
            return Err(AppError::Database(format!("remote: {message}")));
        }

        let rows = first
            .get("response")
            .and_then(|response| response.get("result"))
            .and_then(|result| result.get("rows"))
            .and_then(JsonValue::as_array)
            .cloned()
            .unwrap_or_default();

        rows.iter().map(row_to_values).collect()
    }
}

/// Normalizes a Turso connection string into an HTTP base URL.
///
/// Accepts `libsql://`, `https://`, `http://`, or a bare host. A local
/// sync server (`tursodb <file> --sync-server`) is reachable over `http://`.
pub fn normalize_url(raw_url: &str) -> Result<String> {
    let trimmed = raw_url.trim().trim_end_matches('/');
    if trimmed.is_empty() {
        return Err(AppError::Config("A Turso URL is required.".to_string()));
    }

    let with_scheme = if let Some(rest) = trimmed.strip_prefix("libsql://") {
        format!("https://{rest}")
    } else if trimmed.contains("://") {
        trimmed.to_string()
    } else {
        format!("https://{trimmed}")
    };

    Ok(with_scheme)
}

fn error_message(value: &JsonValue) -> Option<String> {
    value
        .get("error")
        .and_then(|error| error.get("message"))
        .and_then(JsonValue::as_str)
        .map(str::to_string)
}

fn value_to_json(value: &Value) -> Result<JsonValue> {
    match value {
        Value::Null => Ok(json!({ "type": "null" })),
        Value::Integer(number) => Ok(json!({ "type": "integer", "value": number.to_string() })),
        Value::Real(number) => Ok(json!({ "type": "float", "value": number })),
        Value::Text(text) => Ok(json!({ "type": "text", "value": text })),
        // The schema has no BLOB columns; fail loudly rather than corrupt data.
        Value::Blob(_) => Err(AppError::Database(
            "remote sync does not support BLOB values".to_string(),
        )),
    }
}

fn row_to_values(row: &JsonValue) -> Result<Vec<Value>> {
    row.as_array()
        .ok_or_else(|| AppError::Database("remote row was not an array".to_string()))?
        .iter()
        .map(json_to_value)
        .collect()
}

fn json_to_value(value: &JsonValue) -> Result<Value> {
    let kind = value
        .get("type")
        .and_then(JsonValue::as_str)
        .unwrap_or("null");

    match kind {
        "null" => Ok(Value::Null),
        "integer" => Ok(Value::Integer(
            scalar(value)
                .and_then(|text| text.parse().ok())
                .unwrap_or(0),
        )),
        "real" | "float" => Ok(Value::Real(
            scalar(value)
                .and_then(|text| text.parse().ok())
                .unwrap_or(0.0),
        )),
        "text" => Ok(Value::Text(scalar(value).unwrap_or_default())),
        "blob" => Err(AppError::Database(
            "remote sync does not support BLOB values".to_string(),
        )),
        other => Err(AppError::Database(format!(
            "remote returned an unknown value type: {other}"
        ))),
    }
}

fn scalar(value: &JsonValue) -> Option<String> {
    match value.get("value") {
        Some(JsonValue::String(text)) => Some(text.clone()),
        Some(JsonValue::Number(number)) => Some(number.to_string()),
        Some(JsonValue::Bool(flag)) => Some(flag.to_string()),
        _ => None,
    }
}
