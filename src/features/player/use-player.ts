import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { useAppConfig } from "@/lib/app-config";
import type { MediaScenario } from "@/features/media/media-mock";
import {
  AUDIO_TRACKS,
  fetchPlaybackPlaylist,
  SUBTITLE_OFF,
  type PlaybackItem,
  type PlaybackPlaylist,
} from "@/features/player/player-mock";

export const SEEK_STEP_SECONDS = 10;
export const VOLUME_STEP = 5;
export const RATE_STEP = 0.25;
export const MIN_RATE = 0.25;
export const MAX_RATE = 3;
export const DOCK_HIDE_MS = 3000;

export type PlayerPhase = "loading" | "error" | "ready";
export type PlaybackStatus = "playing" | "paused" | "ended";

export type PlayerState = {
  status: PlaybackStatus;
  positionSeconds: number;
  durationSeconds: number;
  progress: number;
  volume: number;
  muted: boolean;
  rate: number;
  audioTrackId: string;
  subtitleTrackId: string;
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
  selectAudioTrack: (trackId: string) => void;
  selectSubtitleTrack: (trackId: string) => void;
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
};

type State = {
  playlist: PlaybackPlaylist | null;
  itemIndex: number;
  status: PlaybackStatus;
  positionSeconds: number;
  volume: number;
  muted: boolean;
  rate: number;
  audioTrackId: string;
  subtitleTrackId: string;
  fullscreen: boolean;
  dockVisible: boolean;
  helpOpen: boolean;
};

type Action =
  | { type: "loaded"; playlist: PlaybackPlaylist }
  | { type: "toggle-play" }
  | { type: "play" }
  | { type: "pause" }
  | { type: "seek-to"; seconds: number }
  | { type: "seek-by"; delta: number }
  | { type: "set-volume"; volume: number }
  | { type: "adjust-volume"; delta: number }
  | { type: "toggle-mute" }
  | { type: "set-rate"; rate: number }
  | { type: "adjust-rate"; delta: number }
  | { type: "select-audio"; trackId: string }
  | { type: "select-subtitle"; trackId: string }
  | { type: "cycle-audio" }
  | { type: "cycle-subtitle" }
  | { type: "toggle-subtitles" }
  | { type: "next" }
  | { type: "previous" }
  | { type: "next-season" }
  | { type: "previous-season" }
  | { type: "set-fullscreen"; fullscreen: boolean }
  | { type: "show-dock" }
  | { type: "hide-dock" }
  | { type: "set-help"; open: boolean }
  | { type: "tick"; seconds: number };

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function clampVolume(volume: number): number {
  return clamp(Math.round(volume), 0, 100);
}

function clampRate(rate: number): number {
  return clamp(Math.round(rate * 100) / 100, MIN_RATE, MAX_RATE);
}

function createInitialState(volume: number): State {
  return {
    playlist: null,
    itemIndex: 0,
    status: "paused",
    positionSeconds: 0,
    volume: clampVolume(volume),
    muted: false,
    rate: 1,
    audioTrackId: AUDIO_TRACKS[0]?.id ?? SUBTITLE_OFF,
    subtitleTrackId: SUBTITLE_OFF,
    fullscreen: false,
    dockVisible: true,
    helpOpen: false,
  };
}

function currentItem(state: State): PlaybackItem | null {
  return state.playlist?.items[state.itemIndex] ?? null;
}

function durationOf(state: State): number {
  return currentItem(state)?.durationSeconds ?? 0;
}

function pickStartIndex(playlist: PlaybackPlaylist): number {
  const index = playlist.items.findIndex(
    (item) => item.startPositionSeconds > 0,
  );
  return index >= 0 ? index : 0;
}

function withItem(state: State, index: number, status: PlaybackStatus): State {
  const item = state.playlist?.items[index];
  if (!item) return state;
  return {
    ...state,
    itemIndex: index,
    status,
    positionSeconds: item.startPositionSeconds,
    audioTrackId: item.audioTracks[0]?.id ?? SUBTITLE_OFF,
    subtitleTrackId: SUBTITLE_OFF,
  };
}

function seasonIndexOf(playlist: PlaybackPlaylist, itemId: string): number {
  return playlist.seasons.findIndex((season) =>
    season.items.some((item) => item.id === itemId),
  );
}

function indexOfItem(playlist: PlaybackPlaylist, itemId: string): number {
  return playlist.items.findIndex((item) => item.id === itemId);
}

function playerReducer(state: State, action: Action): State {
  switch (action.type) {
    case "loaded": {
      const index = pickStartIndex(action.playlist);
      return withItem(
        { ...state, playlist: action.playlist },
        index,
        "playing",
      );
    }

    case "toggle-play": {
      if (state.status === "playing") {
        return { ...state, status: "paused" };
      }
      if (state.status === "ended") {
        return { ...state, positionSeconds: 0, status: "playing" };
      }
      return { ...state, status: "playing" };
    }

    case "play": {
      if (state.status === "playing") return state;
      const positionSeconds =
        state.status === "ended" ? 0 : state.positionSeconds;
      return { ...state, positionSeconds, status: "playing" };
    }

    case "pause":
      return state.status === "playing"
        ? { ...state, status: "paused" }
        : state;

    case "seek-to": {
      const duration = durationOf(state);
      const target = Math.max(0, action.seconds);
      return {
        ...state,
        positionSeconds: duration > 0 ? Math.min(target, duration) : target,
      };
    }

    case "seek-by": {
      const duration = durationOf(state);
      const target = Math.max(0, state.positionSeconds + action.delta);
      return {
        ...state,
        positionSeconds: duration > 0 ? Math.min(target, duration) : target,
      };
    }

    case "set-volume":
      return { ...state, volume: clampVolume(action.volume) };

    case "adjust-volume":
      return { ...state, volume: clampVolume(state.volume + action.delta) };

    case "toggle-mute":
      return { ...state, muted: !state.muted };

    case "set-rate":
      return { ...state, rate: clampRate(action.rate) };

    case "adjust-rate":
      return { ...state, rate: clampRate(state.rate + action.delta) };

    case "select-audio":
      return { ...state, audioTrackId: action.trackId };

    case "select-subtitle":
      return { ...state, subtitleTrackId: action.trackId };

    case "cycle-audio": {
      const tracks = currentItem(state)?.audioTracks ?? [];
      if (tracks.length === 0) return state;
      const index = tracks.findIndex(
        (track) => track.id === state.audioTrackId,
      );
      return {
        ...state,
        audioTrackId: tracks[(index + 1) % tracks.length].id,
      };
    }

    case "cycle-subtitle": {
      const tracks = currentItem(state)?.subtitleTracks ?? [];
      const ids = [SUBTITLE_OFF, ...tracks.map((track) => track.id)];
      const index = ids.indexOf(state.subtitleTrackId);
      return {
        ...state,
        subtitleTrackId: ids[(index + 1) % ids.length],
      };
    }

    case "toggle-subtitles": {
      if (state.subtitleTrackId !== SUBTITLE_OFF) {
        return { ...state, subtitleTrackId: SUBTITLE_OFF };
      }
      const first = currentItem(state)?.subtitleTracks[0]?.id;
      return { ...state, subtitleTrackId: first ?? SUBTITLE_OFF };
    }

    case "next": {
      if (!state.playlist) return state;
      const index = state.itemIndex + 1;
      if (index >= state.playlist.items.length) return state;
      return withItem(state, index, "playing");
    }

    case "previous": {
      if (state.positionSeconds > 5) {
        return { ...state, positionSeconds: 0 };
      }
      const index = state.itemIndex - 1;
      if (index < 0) return { ...state, positionSeconds: 0 };
      return withItem(state, index, "playing");
    }

    case "next-season": {
      if (!state.playlist) return state;
      const item = currentItem(state);
      if (!item) return state;
      const seasonIndex = seasonIndexOf(state.playlist, item.id);
      if (seasonIndex < 0 || seasonIndex >= state.playlist.seasons.length - 1) {
        return state;
      }
      const target = state.playlist.seasons[seasonIndex + 1]?.items[0];
      if (!target) return state;
      const index = indexOfItem(state.playlist, target.id);
      return index >= 0 ? withItem(state, index, "playing") : state;
    }

    case "previous-season": {
      if (!state.playlist) return state;
      const item = currentItem(state);
      if (!item) return state;
      const seasonIndex = seasonIndexOf(state.playlist, item.id);
      if (seasonIndex <= 0) return state;
      const target = state.playlist.seasons[seasonIndex - 1]?.items[0];
      if (!target) return state;
      const index = indexOfItem(state.playlist, target.id);
      return index >= 0 ? withItem(state, index, "playing") : state;
    }

    case "set-fullscreen":
      return { ...state, fullscreen: action.fullscreen };

    case "show-dock":
      return state.dockVisible ? state : { ...state, dockVisible: true };

    case "hide-dock":
      if (state.status !== "playing" || state.helpOpen) return state;
      return state.dockVisible ? { ...state, dockVisible: false } : state;

    case "set-help":
      return {
        ...state,
        helpOpen: action.open,
        dockVisible: action.open ? true : state.dockVisible,
      };

    case "tick": {
      if (state.status !== "playing") return state;
      const duration = durationOf(state);
      const positionSeconds =
        state.positionSeconds + action.seconds * state.rate;
      if (duration > 0 && positionSeconds >= duration) {
        return {
          ...state,
          positionSeconds: duration,
          status: "ended",
          dockVisible: true,
        };
      }
      return { ...state, positionSeconds };
    }

    default:
      return state;
  }
}

type LoadState = {
  key: string;
  status: PlayerPhase;
  error: Error | null;
};

export function usePlayer(
  mediaId: string,
  scenario: MediaScenario = "default",
): PlayerController {
  const preferredVolume = useAppConfig((state) => state.player.volume);
  const [state, dispatch] = useReducer(
    playerReducer,
    preferredVolume,
    createInitialState,
  );
  const [reloadToken, setReloadToken] = useState(0);
  const requestKey = `${mediaId}:${scenario}:${reloadToken}`;
  const [load, setLoad] = useState<LoadState>(() => ({
    key: requestKey,
    status: "loading",
    error: null,
  }));
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let active = true;

    fetchPlaybackPlaylist(mediaId, scenario).then(
      (playlist) => {
        if (!active) return;
        setLoad({ key: requestKey, status: "ready", error: null });
        dispatch({ type: "loaded", playlist });
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
  }, [mediaId, scenario, requestKey]);

  useEffect(() => {
    if (state.status !== "playing") return;
    const interval = setInterval(
      () => dispatch({ type: "tick", seconds: 1 }),
      1000,
    );
    return () => clearInterval(interval);
  }, [state.status]);

  const clearHideTimeout = useCallback(() => {
    if (hideTimeoutRef.current !== null) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  }, []);

  const scheduleHide = useCallback(() => {
    clearHideTimeout();
    hideTimeoutRef.current = setTimeout(
      () => dispatch({ type: "hide-dock" }),
      DOCK_HIDE_MS,
    );
  }, [clearHideTimeout]);

  useEffect(() => {
    if (state.status === "playing" && !state.helpOpen) {
      scheduleHide();
    } else {
      clearHideTimeout();
    }
    return clearHideTimeout;
  }, [state.status, state.helpOpen, scheduleHide, clearHideTimeout]);

  const notifyActivity = useCallback(() => {
    dispatch({ type: "show-dock" });
    scheduleHide();
  }, [scheduleHide]);

  const reload = useCallback(() => setReloadToken((token) => token + 1), []);

  const commands = useMemo<PlayerCommands>(
    () => ({
      togglePlay: () => dispatch({ type: "toggle-play" }),
      play: () => dispatch({ type: "play" }),
      pause: () => dispatch({ type: "pause" }),
      seekTo: (seconds) => dispatch({ type: "seek-to", seconds }),
      seekBy: (delta) => dispatch({ type: "seek-by", delta }),
      setVolume: (volume) => dispatch({ type: "set-volume", volume }),
      adjustVolume: (delta) => dispatch({ type: "adjust-volume", delta }),
      toggleMute: () => dispatch({ type: "toggle-mute" }),
      setRate: (rate) => dispatch({ type: "set-rate", rate }),
      adjustRate: (delta) => dispatch({ type: "adjust-rate", delta }),
      selectAudioTrack: (trackId) =>
        dispatch({ type: "select-audio", trackId }),
      selectSubtitleTrack: (trackId) =>
        dispatch({ type: "select-subtitle", trackId }),
      cycleAudioTrack: () => dispatch({ type: "cycle-audio" }),
      cycleSubtitleTrack: () => dispatch({ type: "cycle-subtitle" }),
      toggleSubtitles: () => dispatch({ type: "toggle-subtitles" }),
      next: () => dispatch({ type: "next" }),
      previous: () => dispatch({ type: "previous" }),
      nextSeason: () => dispatch({ type: "next-season" }),
      previousSeason: () => dispatch({ type: "previous-season" }),
      setFullscreen: (fullscreen) =>
        dispatch({ type: "set-fullscreen", fullscreen }),
      setHelpOpen: (open) => dispatch({ type: "set-help", open }),
      notifyActivity,
    }),
    [notifyActivity],
  );

  const current = state.playlist?.items[state.itemIndex] ?? null;
  const durationSeconds = current?.durationSeconds ?? 0;
  const currentLoad =
    load.key === requestKey
      ? load
      : { key: requestKey, status: "loading" as PlayerPhase, error: null };

  return {
    status: currentLoad.status,
    error: currentLoad.error,
    reload,
    playlist: state.playlist,
    current,
    state: {
      status: state.status,
      positionSeconds: state.positionSeconds,
      durationSeconds,
      progress:
        durationSeconds > 0
          ? clamp(state.positionSeconds / durationSeconds, 0, 1)
          : 0,
      volume: state.volume,
      muted: state.muted,
      rate: state.rate,
      audioTrackId: state.audioTrackId,
      subtitleTrackId: state.subtitleTrackId,
      fullscreen: state.fullscreen,
      dockVisible: state.dockVisible,
      helpOpen: state.helpOpen,
      hasNext: state.playlist
        ? state.itemIndex < state.playlist.items.length - 1
        : false,
      hasPrevious: state.itemIndex > 0,
    },
    commands,
  };
}
