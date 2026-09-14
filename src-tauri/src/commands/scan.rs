use std::cmp::Ordering;
use std::collections::{HashMap, HashSet};

use serde::{Deserialize, Serialize};
use tauri::State;
use turso::transaction::{Transaction, TransactionBehavior};
use uuid::Uuid;

use crate::commands::linking::probe_file;
use crate::db::repositories::{
    episode as episode_repo, media_item as media_repo, season as season_repo,
    video_file as video_file_repo,
};
use crate::domain::{MediaType, VideoFile};
use crate::error::{AppError, Result};
use crate::services::scanner::{self, Confidence};
use crate::state::AppState;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanMatch {
    pub path: String,
    pub file_name: String,
    pub season_number: i64,
    pub episode_number: i64,
    pub episode_id: String,
    pub episode_name: String,
    pub notes: Vec<String>,
    pub conflict: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanUnmatched {
    pub path: String,
    pub file_name: String,
    pub reason: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanIgnored {
    pub path: String,
    pub file_name: String,
    pub reason: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanProposal {
    pub folder: String,
    pub media_id: String,
    pub auto: Vec<ScanMatch>,
    pub needs_confirmation: Vec<ScanMatch>,
    pub unmatched: Vec<ScanUnmatched>,
    pub ignored: Vec<ScanIgnored>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanMatchInput {
    pub episode_id: String,
    pub path: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppliedScan {
    pub linked: usize,
}

fn compare_matches(left: &ScanMatch, right: &ScanMatch) -> Ordering {
    (left.season_number, left.episode_number, &left.path).cmp(&(
        right.season_number,
        right.episode_number,
        &right.path,
    ))
}

fn call_out_conflicts(auto: &mut Vec<ScanMatch>, confirm: &mut Vec<ScanMatch>) {
    let mut counts: HashMap<String, usize> = HashMap::new();
    for candidate in auto.iter().chain(confirm.iter()) {
        *counts.entry(candidate.episode_id.clone()).or_insert(0) += 1;
    }

    for candidate in auto.iter_mut().chain(confirm.iter_mut()) {
        if counts.get(&candidate.episode_id).copied().unwrap_or(0) > 1 {
            candidate.conflict = true;
            candidate.notes.push(format!(
                "another file also matches S{:02}E{:02}",
                candidate.season_number, candidate.episode_number
            ));
        }
    }

    let mut promoted = Vec::new();
    auto.retain(|candidate| {
        if candidate.conflict {
            promoted.push(candidate.clone());
            false
        } else {
            true
        }
    });
    confirm.extend(promoted);
}

#[tauri::command]
pub async fn scan_series_folder(
    state: State<'_, AppState>,
    media_id: String,
    folder: String,
) -> Result<ScanProposal> {
    let connection = state.database().await?.connect().await?;
    let item = media_repo::find_by_id(&connection, &media_id)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("media item {media_id}")))?;

    if item.media_type != MediaType::Tv {
        return Err(AppError::Metadata(
            "Folder scanning is only available for TV series.".to_string(),
        ));
    }

    let seasons = season_repo::list_for_media(&connection, &media_id).await?;
    let episodes = episode_repo::list_for_media(&connection, &media_id).await?;

    let season_numbers: HashMap<String, i64> = seasons
        .iter()
        .map(|season| (season.id.clone(), season.season_number))
        .collect();
    let episodes_by_number: HashMap<(i64, i64), _> = episodes
        .iter()
        .filter_map(|episode| {
            let season = season_numbers.get(&episode.season_id)?;
            Some(((*season, episode.episode_number), episode))
        })
        .collect();

    let scanned = scanner::scan_folder(&folder)?;

    let mut auto = Vec::new();
    let mut needs_confirmation = Vec::new();
    let mut unmatched = Vec::new();
    let mut ignored = Vec::new();

    for file in scanned {
        if let Some(reason) = file.ignore_reason {
            ignored.push(ScanIgnored {
                path: file.path,
                file_name: file.file_name,
                reason,
            });
            continue;
        }

        let Some(parsed) = file.parsed else {
            unmatched.push(ScanUnmatched {
                path: file.path,
                file_name: file.file_name,
                reason: "No episode number in the file name.".to_string(),
            });
            continue;
        };

        let Some(season) = parsed.season.or(file.folder_season) else {
            unmatched.push(ScanUnmatched {
                path: file.path,
                file_name: file.file_name,
                reason: "No season in the file name or folder.".to_string(),
            });
            continue;
        };

        let Some(episode) = episodes_by_number.get(&(season, parsed.episode)) else {
            unmatched.push(ScanUnmatched {
                path: file.path,
                file_name: file.file_name,
                reason: format!("S{season:02}E{:02} is not in this series.", parsed.episode),
            });
            continue;
        };

        let mut notes = parsed.notes.clone();
        if parsed.season.is_none() {
            notes.push(format!("season {season} taken from the folder"));
        }

        let candidate = ScanMatch {
            path: file.path,
            file_name: file.file_name,
            season_number: season,
            episode_number: parsed.episode,
            episode_id: episode.id.clone(),
            episode_name: episode.name.clone(),
            notes,
            conflict: false,
        };

        if parsed.confidence == Confidence::High {
            auto.push(candidate);
        } else {
            needs_confirmation.push(candidate);
        }
    }

    call_out_conflicts(&mut auto, &mut needs_confirmation);

    auto.sort_by(compare_matches);
    needs_confirmation.sort_by(compare_matches);
    unmatched.sort_by(|left, right| left.path.cmp(&right.path));
    ignored.sort_by(|left, right| left.path.cmp(&right.path));

    Ok(ScanProposal {
        folder,
        media_id,
        auto,
        needs_confirmation,
        unmatched,
        ignored,
    })
}

#[tauri::command]
pub async fn apply_scan_matches(
    state: State<'_, AppState>,
    media_id: String,
    matches: Vec<ScanMatchInput>,
) -> Result<AppliedScan> {
    let database = state.database().await?;
    let connection = database.connect().await?;
    let item = media_repo::find_by_id(&connection, &media_id)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("media item {media_id}")))?;

    if item.media_type != MediaType::Tv {
        return Err(AppError::Metadata(
            "Folder scanning is only available for TV series.".to_string(),
        ));
    }

    let episodes = episode_repo::list_for_media(&connection, &media_id).await?;
    let known_episodes: HashSet<&str> =
        episodes.iter().map(|episode| episode.id.as_str()).collect();

    let mut seen_episodes = HashSet::new();
    let mut seen_paths = HashSet::new();
    for entry in &matches {
        if !known_episodes.contains(entry.episode_id.as_str()) {
            return Err(AppError::Metadata(
                "A match points to an episode that is not in this series.".to_string(),
            ));
        }
        if !seen_episodes.insert(entry.episode_id.as_str()) {
            return Err(AppError::Metadata(
                "More than one file matches the same episode. Resolve the conflicts first."
                    .to_string(),
            ));
        }
        if !seen_paths.insert(entry.path.as_str()) {
            return Err(AppError::Metadata(
                "One file is matched to more than one episode.".to_string(),
            ));
        }
    }

    let device_id = state.config().device_id;
    let transaction =
        Transaction::new_unchecked(&connection, TransactionBehavior::Immediate).await?;

    for entry in &matches {
        let (size_bytes, mtime, container) = probe_file(&entry.path)?;
        let file = VideoFile {
            id: Uuid::new_v4().to_string(),
            media_item_id: media_id.clone(),
            episode_id: Some(entry.episode_id.clone()),
            device_id: device_id.clone(),
            path: entry.path.clone(),
            size_bytes,
            mtime,
            container,
        };
        video_file_repo::replace_for_target(&transaction, &file).await?;
    }

    transaction.commit().await?;
    state.trigger_sync().await;

    Ok(AppliedScan {
        linked: matches.len(),
    })
}
