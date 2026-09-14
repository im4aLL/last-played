export type MediaType = "movie" | "tv";

export type WatchProgress = {
  positionSeconds: number;
  durationSeconds: number;
  watched: boolean;
};

export type VideoFile = {
  id: string;
  path: string;
  fileName: string;
  sizeBytes: number | null;
  mtime: number | null;
  container: string | null;
};

export type MediaItem = {
  id: string;
  type: MediaType;
  title: string;
  year: number | null;
  posterUrl: string | null;
  progress: WatchProgress | null;
};

export type Episode = {
  id: string;
  episodeNumber: number;
  name: string;
  overview: string | null;
  airDate: string | null;
  runtimeMinutes: number | null;
  fileLinked: boolean;
  videoFile: VideoFile | null;
  progress: WatchProgress | null;
};

export type Season = {
  id: string;
  seasonNumber: number;
  name: string;
  episodes: Episode[];
};

export type MediaDetail = {
  id: string;
  type: MediaType;
  title: string;
  year: number | null;
  overview: string | null;
  posterUrl: string | null;
  backdropUrl: string | null;
  releaseDate: string | null;
  runtimeMinutes: number | null;
  genres: string[];
  progress: WatchProgress | null;
  videoFile: VideoFile | null;
  seasons: Season[];
};

export type EpisodeWatchState = "unwatched" | "in-progress" | "watched";

export type TmdbSearchResult = {
  tmdbId: number;
  mediaType: MediaType;
  title: string;
  year: number | null;
  overview: string | null;
  posterUrl: string | null;
};

export type EpisodePreview = {
  episodeNumber: number;
  name: string;
  overview: string | null;
  stillUrl: string | null;
  airDate: string | null;
  runtime: number | null;
};

export type SeasonPreview = {
  seasonNumber: number;
  name: string;
  overview: string | null;
  posterUrl: string | null;
  airDate: string | null;
  episodeCount: number;
  episodes: EpisodePreview[];
};

export type MediaPreview = {
  tmdbId: number;
  mediaType: MediaType;
  title: string;
  year: number | null;
  overview: string | null;
  posterUrl: string | null;
  backdropUrl: string | null;
  releaseDate: string | null;
  runtime: number | null;
  seasonCount: number;
  episodeCount: number;
  seasons: SeasonPreview[];
};

export type AddedMedia = {
  id: string;
  mediaType: MediaType;
  title: string;
  year: number | null;
  posterUrl: string | null;
  seasonCount: number;
  episodeCount: number;
  refreshed: boolean;
};

export function progressRatio(progress: WatchProgress | null): number | null {
  if (!progress || progress.durationSeconds <= 0) return null;
  return Math.min(
    Math.max(progress.positionSeconds / progress.durationSeconds, 0),
    1,
  );
}

export function episodeWatchState(
  progress: WatchProgress | null,
): EpisodeWatchState {
  if (!progress) return "unwatched";
  if (progress.watched) return "watched";
  return progress.positionSeconds > 0 ? "in-progress" : "unwatched";
}
