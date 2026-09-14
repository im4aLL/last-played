import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RefObject } from "react";
import * as api from "@/lib/api";
import type {
  PlayerState as BackendState,
  PlayerTrack,
  SurfaceBounds,
} from "@/lib/api";
import { useAppConfig } from "@/lib/app-config";
import {
  fetchPlaybackPlaylist,
  SUBTITLE_OFF,
  type PlaybackItem,
  type PlaybackPlaylist,
} from "@/features/player/player-mock";

export { SUBTITLE_OFF };

export const SEEK_STEP_SECONDS = 10;
export const VOLUME_STEP = 5;
export const RATE_STEP = 0.25;
export const MIN_RATE = 0.25;
export const MAX_RATE = 3;
export const DOCK_HIDE_MS = 3000;

export type PlayerPhase = "loading" | "error" | "ready";
export type PlaybackStatus = "playing" | "paused" | "buffering" | "ended";

export type PlayerState = {
  status: PlaybackStatus;
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
  fullscreen: boolean;
  dockVisible: boolean;
  helpOpen: boolean;
  hasNext: boolean;
  hasPrevious: boolean;
};

export type PlayerCommands = {
  togglePlay: () => void;
  play: () => void;
  pause: () => void;
  seekTo: (seconds: number) => void;
  seekBy: (delta: number) => void;
  setVolume: (volume: number) => void;
  adjustVolume: (delta: number) => void;
  toggleMute: () => void;
  setRate: (rate: number) => void;
  adjustRate: (delta: number) => void;
  selectAudioTrack: (trackId: number) => void;
  selectSubtitleTrack: (trackId: number) => void;
  cycleAudioTrack: () => void;
  cycleSubtitleTrack: () => void;
  toggleSubtitles: () => void;
  next: () => void;
  previous: () => void;
  nextSeason: () => void;
  previousSeason: () => void;
  setFullscreen: (fullscreen: boolean) => void;
  setHelpOpen: (open: boolean) => void;
  notifyActivity: () => void;
};

export type PlayerController = {
  status: PlayerPhase;
  error: Error | null;
  reload: () => void;
  playlist: PlaybackPlaylist | null;
  current: PlaybackItem | null;
  state: PlayerState;
  commands: PlayerCommands;
  stageRef: RefObject<HTMLDivElement | null>;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function mapStatus(status: BackendState["status"]): PlaybackStatus {
  switch (status) {
    case "playing":
      return "playing";
    case "paused":
      return "paused";
    case "ended":
      return "ended";
    default:
      return "buffering";
  }
}

function pickStartIndex(
  playlist: PlaybackPlaylist,
  episodeId: string | undefined,
): number {
  if (episodeId) {
    const index = playlist.items.findIndex((item) => item.id === episodeId);
    if (index >= 0) return index;
  }
  const playableWithProgress = playlist.items.findIndex(
    (item) => item.filePath != null && item.startPositionSeconds > 0,
  );
  if (playableWithProgress >= 0) return playableWithProgress;
  const firstPlayable = playlist.items.findIndex(
    (item) => item.filePath != null,
  );
  return firstPlayable >= 0 ? firstPlayable : 0;
}

function stepIndex(
  playlist: PlaybackPlaylist,
  index: number,
  direction: number,
): number {
  let candidate = index + direction;
  while (candidate >= 0 && candidate < playlist.items.length) {
    if (playlist.items[candidate]?.filePath != null) return candidate;
    candidate += direction;
  }
  return index;
}

function seasonIndexOfItem(playlist: PlaybackPlaylist, itemId: string): number {
  return playlist.seasons.findIndex((season) =>
    season.items.some((item) => item.id === itemId),
  );
}

function firstPlayableInSeason(
  playlist: PlaybackPlaylist,
  seasonIndex: number,
): number {
  const target = playlist.seasons[seasonIndex]?.items.find(
    (item) => item.filePath != null,
  );
  if (!target) return -1;
  return playlist.items.findIndex((item) => item.id === target.id);
}

export function usePlayer(
  mediaId: string,
  episodeId?: string,
): PlayerController {
  const preferredVolume = useAppConfig((state) => state.player.volume);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const volumeAppliedRef = useRef(false);

  const [reloadToken, setReloadToken] = useState(0);
  const requestKey = `${mediaId}:${episodeId ?? ""}:${reloadToken}`;

  const [playlist, setPlaylist] = useState<PlaybackPlaylist | null>(null);
  const [itemIndex, setItemIndex] = useState(0);
  const [backend, setBackend] = useState<BackendState | null>(null);
  const [load, setLoad] = useState<{
    key: string;
    status: PlayerPhase;
    error: Error | null;
  }>({ key: requestKey, status: "loading", error: null });
  const [playbackError, setPlaybackError] = useState<Error | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [dockVisible, setDockVisible] = useState(true);
  const [helpOpen, setHelpOpen] = useState(false);

  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const measureBounds = useCallback((): SurfaceBounds | null => {
    const element = stageRef.current;
    if (!element) return null;
    const rect = element.getBoundingClientRect();
    return {
      x: rect.left,
      y: rect.top,
      width: rect.width,
      height: rect.height,
    };
  }, []);

  const start = useCallback(
    async (list: PlaybackPlaylist, index: number) => {
      const item = list.items[index];
      if (!item) return;
      if (!item.filePath) {
        setPlaybackError(
          new Error("No video file is linked for this title yet."),
        );
        return;
      }

      setPlaybackError(null);
      try {
        const state = await api.playVideo(
          item.filePath,
          item.startPositionSeconds > 0 ? item.startPositionSeconds : null,
          measureBounds(),
        );
        setBackend(state);
        const bounds = measureBounds();
        if (bounds) {
          void api.setPlayerBounds(bounds).catch(() => undefined);
        }
        if (!volumeAppliedRef.current) {
          volumeAppliedRef.current = true;
          const preferred = useAppConfig.getState().player.volume;
          if (state.volume !== preferred) {
            void api
              .playerCommand("setVolume", preferred)
              .then(setBackend)
              .catch(() => undefined);
          }
        }
      } catch (value) {
        setPlaybackError(
          value instanceof Error ? value : new Error(String(value)),
        );
      }
    },
    [measureBounds],
  );

  useEffect(() => {
    let active = true;

    fetchPlaybackPlaylist(mediaId).then(
      (result) => {
        if (!active) return;
        const index = pickStartIndex(result, episodeId);
        volumeAppliedRef.current = false;
        setBackend(null);
        setPlaybackError(null);
        setPlaylist(result);
        setItemIndex(index);
        setLoad({ key: requestKey, status: "ready", error: null });
        void start(result, index);
      },
      (value: unknown) => {
        if (!active) return;
        setLoad({
          key: requestKey,
          status: "error",
          error: value instanceof Error ? value : new Error(String(value)),
        });
      },
    );

    return () => {
      active = false;
    };
  }, [mediaId, episodeId, requestKey, start]);

  const phase: PlayerPhase = load.key === requestKey ? load.status : "loading";
  const loadError = load.key === requestKey ? load.error : null;

  useEffect(() => {
    return () => {
      void api.stopPlayer().catch(() => undefined);
    };
  }, []);

  const switchTo = useCallback(
    (index: number) => {
      if (!playlist) return;
      setItemIndex(index);
      void start(playlist, index);
    },
    [playlist, start],
  );

  const send = useCallback((action: string, value?: number) => {
    api.playerCommand(action, value).then(setBackend, (problem: unknown) => {
      console.error(`Player command "${action}" failed`, problem);
    });
  }, []);

  useEffect(() => {
    if (!backend?.hasMedia) return;
    if (backend.status === "ended" || backend.status === "error") return;
    const interval = setInterval(() => {
      api.getPlayerState().then(setBackend, () => undefined);
    }, 500);
    return () => clearInterval(interval);
  }, [backend?.hasMedia, backend?.status]);

  const clearHideTimeout = useCallback(() => {
    if (hideTimeoutRef.current !== null) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  }, []);

  const scheduleHide = useCallback(() => {
    clearHideTimeout();
    hideTimeoutRef.current = setTimeout(() => {
      setDockVisible(false);
    }, DOCK_HIDE_MS);
  }, [clearHideTimeout]);

  const status = backend ? mapStatus(backend.status) : "buffering";

  useEffect(() => {
    if (status === "playing" && !helpOpen) {
      scheduleHide();
    } else {
      clearHideTimeout();
    }
    return clearHideTimeout;
  }, [status, helpOpen, scheduleHide, clearHideTimeout]);

  useEffect(() => {
    const element = stageRef.current;
    if (!element) return;
    const update = () => {
      const bounds = measureBounds();
      if (bounds && bounds.width > 0 && bounds.height > 0) {
        void api.setPlayerBounds(bounds).catch(() => undefined);
      }
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    window.addEventListener("resize", update);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [measureBounds, phase]);

  const commands = useMemo<PlayerCommands>(() => {
    const currentIndex = itemIndex;

    return {
      togglePlay: () => send("toggle"),
      play: () => send("play"),
      pause: () => send("pause"),
      seekTo: (seconds) => send("seek", seconds),
      seekBy: (delta) => send("seekBy", delta),
      setVolume: (volume) => send("setVolume", volume),
      adjustVolume: (delta) => send("adjustVolume", delta),
      toggleMute: () => send("toggleMute"),
      setRate: (rate) => send("setRate", rate),
      adjustRate: (delta) => {
        const current = backend?.rate ?? 1;
        send("setRate", clamp(current + delta, MIN_RATE, MAX_RATE));
      },
      selectAudioTrack: (trackId) => send("selectAudioTrack", trackId),
      selectSubtitleTrack: (trackId) => send("selectSubtitleTrack", trackId),
      cycleAudioTrack: () => {
        const tracks = backend?.audioTracks ?? [];
        if (tracks.length === 0) return;
        const currentTrack = backend?.audioTrackId ?? tracks[0].id;
        const index = tracks.findIndex((track) => track.id === currentTrack);
        send("selectAudioTrack", tracks[(index + 1) % tracks.length].id);
      },
      cycleSubtitleTrack: () => {
        const tracks = backend?.subtitleTracks ?? [];
        const ids = [SUBTITLE_OFF, ...tracks.map((track) => track.id)];
        const currentTrack = backend?.subtitleTrackId ?? SUBTITLE_OFF;
        const index = ids.indexOf(currentTrack);
        send("selectSubtitleTrack", ids[(index + 1) % ids.length]);
      },
      toggleSubtitles: () => {
        const currentTrack = backend?.subtitleTrackId ?? SUBTITLE_OFF;
        if (currentTrack !== SUBTITLE_OFF) {
          send("selectSubtitleTrack", SUBTITLE_OFF);
          return;
        }
        const first = backend?.subtitleTracks.find((track) => track.id >= 0);
        send("selectSubtitleTrack", first?.id ?? SUBTITLE_OFF);
      },
      next: () => {
        if (!playlist) return;
        switchTo(stepIndex(playlist, currentIndex, 1));
      },
      previous: () => {
        if (!playlist) return;
        if ((backend?.positionSeconds ?? 0) > 5) {
          send("seek", 0);
          return;
        }
        switchTo(stepIndex(playlist, currentIndex, -1));
      },
      nextSeason: () => {
        if (!playlist) return;
        const current = playlist.items[currentIndex];
        if (!current) return;
        const seasonIndex = seasonIndexOfItem(playlist, current.id);
        if (seasonIndex < 0 || seasonIndex >= playlist.seasons.length - 1)
          return;
        const target = firstPlayableInSeason(playlist, seasonIndex + 1);
        if (target >= 0) switchTo(target);
      },
      previousSeason: () => {
        if (!playlist) return;
        const current = playlist.items[currentIndex];
        if (!current) return;
        const seasonIndex = seasonIndexOfItem(playlist, current.id);
        if (seasonIndex <= 0) return;
        const target = firstPlayableInSeason(playlist, seasonIndex - 1);
        if (target >= 0) switchTo(target);
      },
      setFullscreen,
      setHelpOpen: (open) => {
        setHelpOpen(open);
        if (open) setDockVisible(true);
      },
      notifyActivity: () => {
        setDockVisible(true);
        scheduleHide();
      },
    };
  }, [backend, itemIndex, playlist, scheduleHide, send, switchTo]);

  const current = playlist?.items[itemIndex] ?? null;

  const state: PlayerState = {
    status,
    positionSeconds: backend?.positionSeconds ?? 0,
    durationSeconds: backend?.durationSeconds ?? current?.durationSeconds ?? 0,
    progress: backend?.progress ?? 0,
    volume: backend?.volume ?? preferredVolume,
    muted: backend?.muted ?? false,
    rate: backend?.rate ?? 1,
    audioTrackId: backend?.audioTrackId ?? -1,
    subtitleTrackId: backend?.subtitleTrackId ?? SUBTITLE_OFF,
    audioTracks: backend?.audioTracks ?? [],
    subtitleTracks: backend?.subtitleTracks ?? [],
    fullscreen,
    dockVisible,
    helpOpen,
    hasNext: playlist ? stepIndex(playlist, itemIndex, 1) !== itemIndex : false,
    hasPrevious: playlist
      ? stepIndex(playlist, itemIndex, -1) !== itemIndex
      : false,
  };

  return {
    status: phase,
    error: loadError ?? playbackError,
    reload: () => setReloadToken((token) => token + 1),
    playlist,
    current,
    state,
    commands,
    stageRef,
  };
}
