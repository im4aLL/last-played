import { invoke } from "@tauri-apps/api/core";
import type {
  AppConfig,
  ConfigInput,
  DatabaseHealth,
  DbMode,
  SyncStatus,
} from "./app-config";
import type {
  AddedMedia,
  AppliedScan,
  LibraryFilter,
  MediaDetail,
  MediaItem,
  MediaPage,
  MediaPreview,
  MediaType,
  ScanMatchInput,
  ScanProposal,
  TmdbSearchResult,
  VideoFile,
  WatchProgress,
} from "./types";

export function getConfig(): Promise<AppConfig> {
  return invoke<AppConfig>("get_config");
}

export function saveConfig(input: ConfigInput): Promise<AppConfig> {
  return invoke<AppConfig>("save_config", { input });
}

export function setDbMode(
  mode: DbMode,
  tursoUrl?: string,
  tursoAuthToken?: string,
): Promise<DatabaseHealth> {
  return invoke<DatabaseHealth>("set_db_mode", {
    mode,
    tursoUrl: tursoUrl ?? null,
    tursoAuthToken: tursoAuthToken ?? null,
  });
}

export function getHealth(): Promise<DatabaseHealth> {
  return invoke<DatabaseHealth>("get_health");
}

export function testDbConnection(): Promise<DatabaseHealth> {
  return invoke<DatabaseHealth>("test_db_connection");
}

export function syncNow(): Promise<SyncStatus> {
  return invoke<SyncStatus>("sync_now");
}

export function getSyncStatus(): Promise<SyncStatus> {
  return invoke<SyncStatus>("get_sync_status");
}

export function setOnlineState(
  online: boolean,
  session: string,
  seq: number,
): Promise<void> {
  return invoke<void>("set_online_state", { online, session, seq });
}

export function getDeviceId(): Promise<string> {
  return invoke<string>("get_device_id");
}

export function searchTmdb(query: string): Promise<TmdbSearchResult[]> {
  return invoke<TmdbSearchResult[]>("search_tmdb", { query });
}

export function previewTmdbMedia(
  mediaType: MediaType,
  tmdbId: number,
): Promise<MediaPreview> {
  return invoke<MediaPreview>("preview_tmdb_media", { mediaType, tmdbId });
}

export function addMediaFromTmdb(
  mediaType: MediaType,
  tmdbId: number,
): Promise<AddedMedia> {
  return invoke<AddedMedia>("add_media_from_tmdb", { mediaType, tmdbId });
}

export function refreshMetadata(mediaId: string): Promise<AddedMedia> {
  return invoke<AddedMedia>("refresh_metadata", { mediaId });
}

export function listMedia(input: {
  filter: LibraryFilter;
  limit: number;
  offset: number;
}): Promise<MediaPage> {
  return invoke<MediaPage>("list_media", input);
}

export function getMedia(mediaId: string): Promise<MediaDetail> {
  return invoke<MediaDetail>("get_media", { mediaId });
}

export function saveProgress(input: {
  mediaId: string;
  episodeId?: string | null;
  positionSeconds: number;
  durationSeconds: number;
}): Promise<WatchProgress> {
  return invoke<WatchProgress>("save_progress", {
    mediaId: input.mediaId,
    episodeId: input.episodeId ?? null,
    positionSeconds: input.positionSeconds,
    durationSeconds: input.durationSeconds,
  });
}

export function getProgress(
  mediaId: string,
  episodeId?: string | null,
): Promise<WatchProgress | null> {
  return invoke<WatchProgress | null>("get_progress", {
    mediaId,
    episodeId: episodeId ?? null,
  });
}

export function setWatched(
  mediaId: string,
  episodeId: string | undefined,
  watched: boolean,
): Promise<WatchProgress> {
  return invoke<WatchProgress>("set_watched", {
    mediaId,
    episodeId: episodeId ?? null,
    watched,
  });
}

export function continueWatching(): Promise<MediaItem[]> {
  return invoke<MediaItem[]>("continue_watching");
}

export function linkMovieFile(
  mediaId: string,
  path: string,
): Promise<VideoFile> {
  return invoke<VideoFile>("link_movie_file", { mediaId, path });
}

export function linkEpisodeFile(
  episodeId: string,
  path: string,
): Promise<VideoFile> {
  return invoke<VideoFile>("link_episode_file", { episodeId, path });
}

export function unlinkVideoFile(videoFileId: string): Promise<void> {
  return invoke<void>("unlink_video_file", { videoFileId });
}

export function scanSeriesFolder(
  mediaId: string,
  folder: string,
): Promise<ScanProposal> {
  return invoke<ScanProposal>("scan_series_folder", { mediaId, folder });
}

export function applyScanMatches(
  mediaId: string,
  matches: ScanMatchInput[],
): Promise<AppliedScan> {
  return invoke<AppliedScan>("apply_scan_matches", { mediaId, matches });
}

export type PlayerTrack = {
  id: number;
  label: string;
};

export type PlayerStatus =
  | "idle"
  | "opening"
  | "buffering"
  | "playing"
  | "paused"
  | "stopped"
  | "ended"
  | "error";

export type PlayerState = {
  status: PlayerStatus;
  positionSeconds: number;
  durationSeconds: number;
  progress: number;
  volume: number;
  muted: boolean;
  rate: number;
  audioTrackId: number;
  subtitleTrackId: number;
  audioTracks: PlayerTrack[];
  subtitleTracks: PlayerTrack[];
  hasVideo: boolean;
  hasMedia: boolean;
  mediaPath: string | null;
};

export type SurfaceBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export function playVideo(
  path: string,
  startSeconds: number | null,
  bounds: SurfaceBounds | null,
): Promise<PlayerState> {
  return invoke<PlayerState>("play_video", { path, startSeconds, bounds });
}

export function playerCommand(
  action: string,
  value?: number,
): Promise<PlayerState> {
  return invoke<PlayerState>("player_command", {
    command: { action, value: value ?? null },
  });
}

export function applySubtitleSize(size: number): Promise<PlayerState> {
  return invoke<PlayerState>("apply_subtitle_size", { size });
}

export function getPlayerState(): Promise<PlayerState> {
  return invoke<PlayerState>("get_player_state");
}

export function setPlayerBounds(bounds: SurfaceBounds): Promise<void> {
  return invoke<void>("set_player_bounds", { bounds });
}

export function setPlayerVisible(visible: boolean): Promise<void> {
  return invoke<void>("set_player_visible", { visible });
}

export function stopPlayer(): Promise<void> {
  return invoke<void>("stop_player");
}
