import { useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "cn";
import ControlDock from "@/features/player/control-dock";
import {
  enterNativeFullscreen,
  exitNativeFullscreen,
} from "@/features/player/fullscreen";
import KeyboardHelp from "@/features/player/keyboard-help";
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
  const { state, current, commands } = controller;

  const enterFullscreen = useCallback(async () => {
    commands.setFullscreen(true);
    if (await enterNativeFullscreen()) return;
    const element = containerRef.current;
    if (element && typeof element.requestFullscreen === "function") {
      try {
        await element.requestFullscreen();
      } catch {
        // The in-app layout already fills the window.
      }
    }
  }, [commands]);

  const exitFullscreen = useCallback(async () => {
    commands.setFullscreen(false);
    if (await exitNativeFullscreen()) return;
    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen();
      } catch {
        // Nothing else to restore.
      }
    }
  }, [commands]);

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

  // `commands` changes on every state poll, so these mount-only effects keep
  // the latest callback in a ref instead of re-running and fighting each other.
  const exitFullscreenRef = useRef(exitFullscreen);
  useEffect(() => {
    exitFullscreenRef.current = exitFullscreen;
  }, [exitFullscreen]);

  const enteredFullscreenRef = useRef(false);
  useEffect(() => {
    if (enteredFullscreenRef.current) return;
    enteredFullscreenRef.current = true;
    void enterFullscreen();
  }, [enterFullscreen]);

  useEffect(() => {
    return () => {
      void exitFullscreenRef.current();
    };
  }, []);

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
      }
      commands.notifyActivity();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
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
        "flex h-svh min-h-0 flex-col overflow-hidden bg-black text-white",
        state.dockVisible ? "cursor-auto" : "cursor-none",
        state.fullscreen && "fixed inset-0 z-50",
      )}
      onPointerMove={commands.notifyActivity}
      onPointerDown={commands.notifyActivity}
    >
      <VideoSurface
        item={current}
        status={state.status}
        stageRef={controller.stageRef}
      />
      {state.dockVisible && (
        <ControlDock
          controller={controller}
          onToggleFullscreen={toggleFullscreen}
          onClose={close}
        />
      )}
      <KeyboardHelp open={state.helpOpen} onOpenChange={commands.setHelpOpen} />
    </div>
  );
}
