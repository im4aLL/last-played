use std::path::Path;

use walkdir::WalkDir;

use crate::error::{AppError, Result};

pub const VIDEO_EXTENSIONS: &[&str] = &[
    "mp4", "mkv", "avi", "mov", "m4v", "webm", "wmv", "flv", "ts",
];

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Confidence {
    High,
    Low,
}

#[derive(Debug, Clone)]
pub struct ParsedName {
    pub season: Option<i64>,
    pub episode: i64,
    pub confidence: Confidence,
    pub notes: Vec<String>,
}

#[derive(Debug, Clone)]
pub struct ScannedFile {
    pub path: String,
    pub file_name: String,
    pub folder_season: Option<i64>,
    pub parsed: Option<ParsedName>,
    pub ignore_reason: Option<String>,
}

pub fn is_video(path: &Path) -> bool {
    path.extension()
        .and_then(|extension| extension.to_str())
        .map(|extension| VIDEO_EXTENSIONS.contains(&extension.to_ascii_lowercase().as_str()))
        .unwrap_or(false)
}

pub fn is_sample(path: &Path) -> bool {
    path.file_name()
        .and_then(|name| name.to_str())
        .map(|name| name.to_ascii_lowercase().contains("sample"))
        .unwrap_or(false)
}

fn parse_season_folder(name: &str) -> Option<i64> {
    let lower = name.to_ascii_lowercase();
    let bytes = lower.as_bytes();
    let keyword = "season";
    let mut search_from = 0;

    while let Some(offset) = lower[search_from..].find(keyword) {
        let start = search_from + offset;
        let after = start + keyword.len();
        let boundary_ok = start == 0 || !bytes[start - 1].is_ascii_alphanumeric();

        if boundary_ok {
            let mut digits_at = after;
            while digits_at < bytes.len() && !bytes[digits_at].is_ascii_alphanumeric() {
                digits_at += 1;
            }
            let (season, count, _) = take_digits(bytes, digits_at);
            if (1..=2).contains(&count) {
                return Some(season);
            }
        }

        search_from = after;
    }

    None
}

fn take_digits(bytes: &[u8], start: usize) -> (i64, usize, usize) {
    let mut index = start;
    let mut value: i64 = 0;
    while index < bytes.len() && bytes[index].is_ascii_digit() {
        value = value * 10 + (bytes[index] - b'0') as i64;
        index += 1;
    }
    (value, index - start, index)
}

fn previous_is_digit(bytes: &[u8], index: usize) -> bool {
    index > 0 && bytes[index - 1].is_ascii_digit()
}

fn next_is_digit(bytes: &[u8], index: usize) -> bool {
    index < bytes.len() && bytes[index].is_ascii_digit()
}

fn is_separator(byte: u8) -> bool {
    !byte.is_ascii_alphanumeric()
}

fn find_season_episode(bytes: &[u8]) -> Option<ParsedName> {
    let mut index = 0;
    while index < bytes.len() {
        if bytes[index] == b's' && !previous_is_digit(bytes, index) {
            let (season, season_digits, season_end) = take_digits(bytes, index + 1);
            if (1..=2).contains(&season_digits) {
                let mut episode_at = season_end;
                while episode_at < bytes.len() && is_separator(bytes[episode_at]) {
                    episode_at += 1;
                }
                if episode_at < bytes.len() && bytes[episode_at] == b'e' {
                    let (episode, episode_digits, episode_end) = take_digits(bytes, episode_at + 1);
                    if (1..=3).contains(&episode_digits) && !next_is_digit(bytes, episode_end) {
                        let multi_episode = bytes.get(episode_end) == Some(&b'e') && {
                            let (_, extra_digits, _) = take_digits(bytes, episode_end + 1);
                            (1..=3).contains(&extra_digits)
                        };
                        let mut notes = Vec::new();
                        if multi_episode {
                            notes.push("multi-episode, links to the first".to_string());
                        }
                        return Some(ParsedName {
                            season: Some(season),
                            episode,
                            confidence: Confidence::High,
                            notes,
                        });
                    }
                }
            }
        }
        index += 1;
    }
    None
}

fn find_cross_episode(bytes: &[u8]) -> Option<ParsedName> {
    let mut index = 0;
    while index < bytes.len() {
        if bytes[index] == b'x' {
            let mut season_start = index;
            while season_start > 0 && bytes[season_start - 1].is_ascii_digit() {
                season_start -= 1;
            }
            let season_digits = index - season_start;
            if (1..=2).contains(&season_digits) {
                let season = bytes[season_start..index]
                    .iter()
                    .fold(0_i64, |value, byte| value * 10 + (byte - b'0') as i64);
                let (episode, episode_digits, episode_end) = take_digits(bytes, index + 1);
                if (2..=3).contains(&episode_digits) && !next_is_digit(bytes, episode_end) {
                    return Some(ParsedName {
                        season: Some(season),
                        episode,
                        confidence: Confidence::High,
                        notes: Vec::new(),
                    });
                }
            }
        }
        index += 1;
    }
    None
}

fn find_episode_only(bytes: &[u8]) -> Option<ParsedName> {
    let mut index = 0;
    while index < bytes.len() {
        if bytes[index] == b'e' && !previous_is_digit(bytes, index) {
            let (episode, episode_digits, episode_end) = take_digits(bytes, index + 1);
            if (1..=3).contains(&episode_digits) && !next_is_digit(bytes, episode_end) {
                return Some(ParsedName {
                    season: None,
                    episode,
                    confidence: Confidence::Low,
                    notes: vec!["no season in the file name".to_string()],
                });
            }
        }
        index += 1;
    }
    None
}

fn find_bare_number(bytes: &[u8]) -> Option<ParsedName> {
    let mut index = 0;
    while index < bytes.len() {
        if bytes[index].is_ascii_digit() {
            let (episode, digits, end) = take_digits(bytes, index);
            let left_ok = index == 0 || !bytes[index - 1].is_ascii_alphanumeric();
            let right_ok = end >= bytes.len() || !bytes[end].is_ascii_alphanumeric();
            if (1..=2).contains(&digits) && left_ok && right_ok {
                return Some(ParsedName {
                    season: None,
                    episode,
                    confidence: Confidence::Low,
                    notes: vec!["bare number".to_string()],
                });
            }
            index = end;
        } else {
            index += 1;
        }
    }
    None
}

pub fn parse_file_name(name: &str) -> Option<ParsedName> {
    let lower = name.to_ascii_lowercase();
    let bytes = lower.as_bytes();
    find_season_episode(bytes)
        .or_else(|| find_cross_episode(bytes))
        .or_else(|| find_episode_only(bytes))
        .or_else(|| find_bare_number(bytes))
}

fn folder_season_for(path: &Path, root: &Path) -> Option<i64> {
    let mut current = path.parent();
    while let Some(directory) = current {
        if let Some(season) = directory
            .file_name()
            .and_then(|name| name.to_str())
            .and_then(parse_season_folder)
        {
            return Some(season);
        }
        if directory == root {
            break;
        }
        current = directory.parent();
    }
    None
}

pub fn scan_folder(folder: &str) -> Result<Vec<ScannedFile>> {
    let root = Path::new(folder);
    if !root.is_dir() {
        return Err(AppError::Metadata(format!("'{folder}' is not a folder.")));
    }

    let mut files = Vec::new();
    for entry in WalkDir::new(root).follow_links(false) {
        let Ok(entry) = entry else {
            continue;
        };
        if !entry.file_type().is_file() {
            continue;
        }

        let path = entry.path();
        let file_name = path
            .file_name()
            .map(|name| name.to_string_lossy().into_owned())
            .unwrap_or_default();
        let stored_path = path.to_string_lossy().into_owned();

        if is_sample(path) {
            files.push(ScannedFile {
                path: stored_path,
                file_name,
                folder_season: None,
                parsed: None,
                ignore_reason: Some("sample".to_string()),
            });
            continue;
        }

        if !is_video(path) {
            files.push(ScannedFile {
                path: stored_path,
                file_name,
                folder_season: None,
                parsed: None,
                ignore_reason: Some("non-video".to_string()),
            });
            continue;
        }

        let folder_season = folder_season_for(path, root);
        let stem = path
            .file_stem()
            .map(|value| value.to_string_lossy().into_owned())
            .unwrap_or_else(|| file_name.clone());
        let parsed = parse_file_name(&stem);

        files.push(ScannedFile {
            path: stored_path,
            file_name,
            folder_season,
            parsed,
            ignore_reason: None,
        });
    }

    files.sort_by(|left, right| left.path.cmp(&right.path));
    Ok(files)
}
