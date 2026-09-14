import {
  fetchMediaDetail,
  type MediaScenario,
} from "@/features/media/media-mock";
import type {
  Episode,
  MediaDetail,
  MediaType,
  WatchProgress,
} from "@/lib/types";

export type PlaybackTrack = {
  id: string;
  label: string;
};

export type PlaybackItem = {
  id: string;
  mediaId: string;
  mediaType: MediaType;
  title: string;
  subtitle: string | null;
  seasonNumber: number | null;
  episodeNumber: number | null;
  durationSeconds: number;
  posterUrl: string | null;
  backdropUrl: string | null;
  audioTracks: PlaybackTrack[];
  subtitleTracks: PlaybackTrack[];
  startPositionSeconds: number;
};

export type PlaybackSeason = {
  seasonNumber: number;
  name: string;
  items: PlaybackItem[];
};

export type PlaybackPlaylist = {
  mediaId: string;
  mediaType: MediaType;
  title: string;
  posterUrl: string | null;
  backdropUrl: string | null;
  seasons: PlaybackSeason[];
  items: PlaybackItem[];
};

export const SUBTITLE_OFF = "off";

export const AUDIO_TRACKS: PlaybackTrack[] = [
  { id: "audio-en-5-1", label: "English 5.1" },
  { id: "audio-en-stereo", label: "English Stereo" },
  { id: "audio-fr-5-1", label: "French 5.1" },
];

export const SUBTITLE_TRACKS: PlaybackTrack[] = [
  { id: "subtitle-en", label: "English" },
  { id: "subtitle-es", label: "Spanish" },
  { id: "subtitle-fr", label: "French" },
];

const FALLBACK_DURATION_SECONDS = 45 * 60;

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function durationFor(
  runtimeMinutes: number | null,
  progress: WatchProgress | null,
): number {
  if (progress && progress.durationSeconds > 0) {
    return progress.durationSeconds;
  }
  if (runtimeMinutes && runtimeMinutes > 0) {
    return runtimeMinutes * 60;
  }
  return FALLBACK_DURATION_SECONDS;
}

function startPositionFor(progress: WatchProgress | null): number {
  if (!progress || progress.watched) return 0;
  return Math.max(0, progress.positionSeconds);
}

function movieItem(detail: MediaDetail): PlaybackItem {
  return {
    id: detail.id,
    mediaId: detail.id,
    mediaType: "movie",
    title: detail.title,
    subtitle: null,
    seasonNumber: null,
    episodeNumber: null,
    durationSeconds: durationFor(detail.runtimeMinutes, detail.progress),
    posterUrl: detail.posterUrl,
    backdropUrl: detail.backdropUrl,
    audioTracks: AUDIO_TRACKS,
    subtitleTracks: SUBTITLE_TRACKS,
    startPositionSeconds: startPositionFor(detail.progress),
  };
}

function episodeItem(
  detail: MediaDetail,
  seasonNumber: number,
  episode: Episode,
): PlaybackItem {
  return {
    id: episode.id,
    mediaId: detail.id,
    mediaType: "tv",
    title: detail.title,
    subtitle: `S${pad(seasonNumber)}E${pad(episode.episodeNumber)} - ${episode.name}`,
    seasonNumber,
    episodeNumber: episode.episodeNumber,
    durationSeconds: durationFor(episode.runtimeMinutes, episode.progress),
    posterUrl: detail.posterUrl,
    backdropUrl: detail.backdropUrl,
    audioTracks: AUDIO_TRACKS,
    subtitleTracks: SUBTITLE_TRACKS,
    startPositionSeconds: startPositionFor(episode.progress),
  };
}

function buildPlaylist(detail: MediaDetail): PlaybackPlaylist {
  const base = {
    mediaId: detail.id,
    mediaType: detail.type,
    title: detail.title,
    posterUrl: detail.posterUrl,
    backdropUrl: detail.backdropUrl,
  };

  if (detail.type === "tv" && detail.seasons.length > 0) {
    const seasons: PlaybackSeason[] = detail.seasons.map((season) => ({
      seasonNumber: season.seasonNumber,
      name: season.name,
      items: season.episodes.map((episode) =>
        episodeItem(detail, season.seasonNumber, episode),
      ),
    }));

    return {
      ...base,
      seasons,
      items: seasons.flatMap((season) => season.items),
    };
  }

  return { ...base, seasons: [], items: [movieItem(detail)] };
}

export async function fetchPlaybackPlaylist(
  mediaId: string,
  scenario: MediaScenario = "default",
): Promise<PlaybackPlaylist> {
  const detail = await fetchMediaDetail(mediaId, scenario);
  return buildPlaylist(detail);
}
