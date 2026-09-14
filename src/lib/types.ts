export type MediaType = "movie" | "tv";

export type WatchProgress = {
  positionSeconds: number;
  durationSeconds: number;
  watched: boolean;
};

export type MediaItem = {
  id: string;
  type: MediaType;
  title: string;
  year: number | null;
  posterUrl: string | null;
  progress: WatchProgress | null;
};

export function progressRatio(progress: WatchProgress | null): number | null {
  if (!progress || progress.durationSeconds <= 0) return null;
  return Math.min(
    Math.max(progress.positionSeconds / progress.durationSeconds, 0),
    1,
  );
}
