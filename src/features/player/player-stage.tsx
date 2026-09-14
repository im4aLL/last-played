import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "cn";
import ControlDock from "@/features/player/control-dock";
import {
  enterNativeFullscreen,
  exitNativeFullscreen,
  focusWebview,
} from "@/features/player/fullscreen";
import KeyboardHelp from "@/features/player/keyboard-help";
import NextEpisodePrompt from "@/features/player/next-episode-prompt";
import PlayerHud from "@/features/player/player-hud";
import VideoSurface from "@/features/player/video-surface";
import {
  RATE_STEP,
  SEEK_STEP_SECONDS,
  VOLUME_STEP,
  type PlayerController,
} from "@/features/player/use-player";

export default function PlayerStage({
  controller,
}: {
  controller: PlayerController;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { state, current, next, commands } = controller;
  const [dismissedId, setDismissedId] = useState<string | null>(null);
  const promptDismissed = current != null && dismissedId === current.id;

  const commandsRef = useRef(commands);
  useEffect(() => {
    commandsRef.current = commands;
  }, [commands]);

  // The webview is transparent while the player is mounted so the native video
  // composited below it is visible.
  useEffect(() => {
    document.documentElement.dataset.player = "true";
    return () => {
      delete document.documentElement.dataset.player;
    };
  }, []);

  const enterFullscreen = useCallback(async () => {
    commandsRef.current.setFullscreen(true);
    if (await enterNativeFullscreen()) {
      await focusWebview();
      return;
    }
    const element = containerRef.current;
    if (element && typeof element.requestFullscreen === "function") {
      try {
        await element.requestFullscreen();
      } catch {
        // The in-app layout already fills the window.
      }
    }
    await focusWebview();
  }, []);

  const exitFullscreen = useCallback(async () => {
    commandsRef.current.setFullscreen(false);
    if (await exitNativeFullscreen()) return;
    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen();
      } catch {
        // Nothing else to restore.
      }
    }
  }, []);

  const toggleFullscreen = useCallback(async () => {
    if (state.fullscreen || document.fullscreenElement) {
      await exitFullscreen();
    } else {
      await enterFullscreen();
    }
  }, [enterFullscreen, exitFullscreen, state.fullscreen]);

  const close = useCallback(() => {
    void exitFullscreen();
    navigate(-1);
  }, [exitFullscreen, navigate]);

  // The player opens fullscreen on entry and restores windowed mode on exit.
  // Setup and teardown live in one effect and the enter defers a microtask so
  // React's development-only StrictMode remount settles in fullscreen instead
  // of entering then immediately exiting.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await Promise.resolve();
      if (cancelled) return;
      await enterFullscreen();
    })();

    return () => {
      cancelled = true;
      void exitFullscreen();
    };
  }, [enterFullscreen, exitFullscreen]);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    function handleFullscreenChange() {
      commands.setFullscreen(document.fullscreenElement === element);
    }
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, [commands]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.isContentEditable ||
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT")
      ) {
        return;
      }

      const { key } = event;
      if (state.helpOpen && key !== "Escape" && key !== "?") {
        return;
      }

      let handled = true;

      switch (key) {
        case " ":
        case "k":
        case "K":
          commands.togglePlay();
          break;
        case "ArrowLeft":
        case "j":
        case "J":
          commands.seekBy(-SEEK_STEP_SECONDS);
          break;
        case "ArrowRight":
        case "l":
        case "L":
          commands.seekBy(SEEK_STEP_SECONDS);
          break;
        case "ArrowUp":
          commands.adjustVolume(VOLUME_STEP);
          break;
        case "ArrowDown":
          commands.adjustVolume(-VOLUME_STEP);
          break;
        case "m":
        case "M":
          commands.toggleMute();
          break;
        case "f":
        case "F":
          void toggleFullscreen();
          break;
        case "n":
          commands.next();
          break;
        case "N":
          commands.nextSeason();
          break;
        case "b":
          commands.previous();
          break;
        case "B":
          commands.previousSeason();
          break;
        case "s":
        case "S":
          commands.cycleSubtitleTrack();
          break;
        case "a":
        case "A":
          commands.cycleAudioTrack();
          break;
        case "c":
        case "C":
          commands.toggleSubtitles();
          break;
        case "[":
          commands.adjustRate(-RATE_STEP);
          break;
        case "]":
          commands.adjustRate(RATE_STEP);
          break;
        case "?":
          commands.setHelpOpen(!state.helpOpen);
          break;
        case "Escape":
          if (state.helpOpen) {
            commands.setHelpOpen(false);
          } else if (state.fullscreen || document.fullscreenElement) {
            void exitFullscreen();
          } else {
            close();
          }
          break;
        default:
          handled = false;
      }

      if (handled) {
        event.preventDefault();
        event.stopPropagation();
      }
      commands.notifyActivity();
    }

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [
    commands,
    close,
    exitFullscreen,
    state.fullscreen,
    state.helpOpen,
    toggleFullscreen,
  ]);

  if (!current) return null;

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative h-svh w-full overflow-hidden bg-transparent text-white",
        state.dockVisible ? "cursor-auto" : "cursor-none",
        state.fullscreen && "fixed inset-0 z-50",
      )}
      onPointerMove={commands.notifyActivity}
      onPointerDown={commands.notifyActivity}
    >
      <VideoSurface
        status={state.status}
        stageRef={controller.stageRef}
        onToggle={commands.togglePlay}
      />
      <PlayerHud feedback={state.feedback} />
      <ControlDock
        controller={controller}
        onToggleFullscreen={toggleFullscreen}
        onClose={close}
      />
      <NextEpisodePrompt
        open={state.status === "ended" && state.hasNext && !promptDismissed}
        next={next}
        onPlay={commands.next}
        onDismiss={() => setDismissedId(current?.id ?? null)}
      />
      <KeyboardHelp open={state.helpOpen} onOpenChange={commands.setHelpOpen} />
    </div>
  );
}
