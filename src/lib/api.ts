import { invoke } from "@tauri-apps/api/core";
import type {
  AppConfig,
  ConfigInput,
  DatabaseHealth,
  DbMode,
} from "./app-config";
import type {
  AddedMedia,
  MediaDetail,
  MediaItem,
  MediaPreview,
  MediaType,
  TmdbSearchResult,
  VideoFile,
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

export function listMedia(): Promise<MediaItem[]> {
  return invoke<MediaItem[]>("list_media");
}

export function getMedia(mediaId: string): Promise<MediaDetail> {
  return invoke<MediaDetail>("get_media", { mediaId });
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
