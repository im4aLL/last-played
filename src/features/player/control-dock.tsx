import {
  Check,
  ChevronDown,
  Keyboard,
  Maximize,
  Minimize,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  X,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import type { ReactNode } from "react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { formatTimecode } from "@/lib/format";
import { SUBTITLE_OFF } from "@/features/player/player-mock";
import {
  SEEK_STEP_SECONDS,
  type PlayerController,
} from "@/features/player/use-player";

const RATE_OPTIONS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

function DockButton({
  label,
  icon: Icon,
  onClick,
  disabled,
  children,
}: {
  label: string;
  icon?: LucideIcon;
  onClick: () => void;
  disabled?: boolean;
  children?: ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="text-white hover:bg-white/10 hover:text-white disabled:opacity-40"
    >
      {Icon ? <Icon /> : null}
      {children}
    </Button>
  );
}

type DockMenu = "audio" | "subtitle" | "speed";

function DockMenuButton({
  label,
  value,
  active,
  onClick,
  className,
}: {
  label: string;
  value: string;
  active: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      aria-label={label}
      aria-expanded={active}
      title={label}
      onClick={onClick}
      className={cn(
        "justify-between gap-1 border border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white",
        active && "bg-white/15",
        className,
      )}
    >
      <span className="truncate">{value}</span>
      <ChevronDown
        className={cn("shrink-0 transition-transform", active && "rotate-180")}
      />
    </Button>
  );
}

function MenuOption({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center justify-between gap-3 rounded px-2 py-1.5 text-left text-sm text-white hover:bg-white/10",
        selected && "bg-white/10",
      )}
    >
      <span className="truncate">{children}</span>
      {selected ? <Check className="size-4 shrink-0" /> : null}
    </button>
  );
}

function MenuPanel({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-md border border-white/10 bg-neutral-900/95 p-1.5">
      <p className="px-2 py-1 text-xs font-medium tracking-wide text-white/40 uppercase">
        {title}
      </p>
      <div className="grid max-h-48 gap-0.5 overflow-y-auto">{children}</div>
    </div>
  );
}

export default function ControlDock({
  controller,
  onToggleFullscreen,
  onClose,
}: {
  controller: PlayerController;
  onToggleFullscreen: () => void;
  onClose: () => void;
}) {
  const { state, current, commands } = controller;
  const [openMenu, setOpenMenu] = useState<DockMenu | null>(null);

  if (!current) return null;

  const isPlaying = state.status === "playing";
  const seekMax = state.durationSeconds > 0 ? state.durationSeconds : 1;

  const audioLabel =
    state.audioTracks.find((track) => track.id === state.audioTrackId)?.label ??
    "Audio";
  const subtitleLabel =
    state.subtitleTracks.find((track) => track.id === state.subtitleTrackId)
      ?.label ?? "Off";
  const speedLabel = `${state.rate}x`;

  const toggleMenu = (menu: DockMenu) => {
    const next = openMenu === menu ? null : menu;
    setOpenMenu(next);
    commands.setOverlayOpen(next !== null);
  };

  const choose = (action: () => void) => {
    action();
    setOpenMenu(null);
    commands.setOverlayOpen(false);
  };

  return (
    <footer
      className={cn(
        "absolute inset-x-0 bottom-0 z-20 w-full bg-gradient-to-t from-black via-black/80 to-transparent px-4 pt-12 pb-3 transition-opacity duration-200",
        state.dockVisible ? "opacity-100" : "pointer-events-none opacity-0",
      )}
      aria-hidden={!state.dockVisible}
      inert={!state.dockVisible}
      onPointerMove={commands.notifyActivity}
    >
      <div className="flex w-full flex-col gap-2">
        {openMenu === "audio" && (
          <MenuPanel title="Audio track">
            {state.audioTracks.length === 0 ? (
              <p className="px-2 py-1.5 text-sm text-white/50">
                No audio tracks reported yet.
              </p>
            ) : (
              state.audioTracks.map((track) => (
                <MenuOption
                  key={track.id}
                  selected={track.id === state.audioTrackId}
                  onClick={() =>
                    choose(() => commands.selectAudioTrack(track.id))
                  }
                >
                  {track.label}
                </MenuOption>
              ))
            )}
          </MenuPanel>
        )}

        {openMenu === "subtitle" && (
          <MenuPanel title="Subtitle track">
            <MenuOption
              selected={state.subtitleTrackId === SUBTITLE_OFF}
              onClick={() =>
                choose(() => commands.selectSubtitleTrack(SUBTITLE_OFF))
              }
            >
              Off
            </MenuOption>
            {state.subtitleTracks
              .filter((track) => track.id !== SUBTITLE_OFF)
              .map((track) => (
                <MenuOption
                  key={track.id}
                  selected={track.id === state.subtitleTrackId}
                  onClick={() =>
                    choose(() => commands.selectSubtitleTrack(track.id))
                  }
                >
                  {track.label}
                </MenuOption>
              ))}
          </MenuPanel>
        )}

        {openMenu === "speed" && (
          <MenuPanel title="Playback speed">
            {RATE_OPTIONS.map((rate) => (
              <MenuOption
                key={rate}
                selected={rate === state.rate}
                onClick={() => choose(() => commands.setRate(rate))}
              >
                {rate}x
              </MenuOption>
            ))}
          </MenuPanel>
        )}

        <div className="flex w-full flex-col gap-2">
          <Slider
            value={[state.positionSeconds]}
            min={0}
            max={seekMax}
            step={1}
            aria-label="Seek"
            onValueChange={([value]) => commands.seekTo(value)}
            className="w-full py-2 [&_[data-slot=slider-range]]:bg-white [&_[data-slot=slider-thumb]]:bg-white [&_[data-slot=slider-track]]:bg-white/20"
          />
          <div className="flex items-center justify-between text-xs text-white/60 tabular-nums">
            <span>{formatTimecode(state.positionSeconds)}</span>
            <span>{formatTimecode(state.durationSeconds)}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <div className="flex items-center gap-0.5">
            <DockButton
              label="Previous episode"
              icon={SkipBack}
              disabled={!state.hasPrevious}
              onClick={commands.previous}
            />
            <DockButton
              label={isPlaying ? "Pause" : "Play"}
              icon={isPlaying ? Pause : Play}
              onClick={commands.togglePlay}
            />
            <DockButton
              label="Next episode"
              icon={SkipForward}
              disabled={!state.hasNext}
              onClick={commands.next}
            />
            <DockButton
              label={`Back ${SEEK_STEP_SECONDS} seconds`}
              icon={RotateCcw}
              onClick={() => commands.seekBy(-SEEK_STEP_SECONDS)}
            />
            <DockButton
              label={`Forward ${SEEK_STEP_SECONDS} seconds`}
              icon={RotateCw}
              onClick={() => commands.seekBy(SEEK_STEP_SECONDS)}
            />
          </div>

          <div className="order-first min-w-0 basis-full px-1 sm:order-none sm:flex-1 sm:basis-auto sm:px-2">
            <p className="truncate text-sm font-medium text-white">
              {current.subtitle ?? current.title}
            </p>
            {current.subtitle && (
              <p className="truncate text-xs text-white/50">{current.title}</p>
            )}
          </div>

          <div className="hidden items-center gap-1.5 lg:flex">
            <DockMenuButton
              label="Audio track"
              value={audioLabel}
              active={openMenu === "audio"}
              onClick={() => toggleMenu("audio")}
              className="w-36"
            />
            <DockMenuButton
              label="Subtitle track"
              value={subtitleLabel}
              active={openMenu === "subtitle"}
              onClick={() => toggleMenu("subtitle")}
              className="w-36"
            />
            <DockMenuButton
              label="Playback speed"
              value={speedLabel}
              active={openMenu === "speed"}
              onClick={() => toggleMenu("speed")}
              className="w-20"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <DockButton
              label={state.muted ? "Unmute" : "Mute"}
              icon={state.muted ? VolumeX : Volume2}
              onClick={commands.toggleMute}
            />
            <Slider
              value={[state.muted ? 0 : state.volume]}
              min={0}
              max={100}
              step={1}
              aria-label="Volume"
              onValueChange={([value]) => commands.setVolume(value)}
              className="hidden w-24 sm:flex [&_[data-slot=slider-range]]:bg-white [&_[data-slot=slider-thumb]]:bg-white [&_[data-slot=slider-track]]:bg-white/20"
            />
            <span className="hidden w-9 text-right text-xs text-white/60 tabular-nums md:inline">
              {state.muted ? 0 : state.volume}%
            </span>
            <DockButton
              label="Keyboard shortcuts"
              icon={Keyboard}
              onClick={() => commands.setHelpOpen(true)}
            />
            <DockButton
              label={state.fullscreen ? "Exit fullscreen" : "Fullscreen"}
              icon={state.fullscreen ? Minimize : Maximize}
              onClick={onToggleFullscreen}
            />
            <DockButton label="Close player" icon={X} onClick={onClose} />
          </div>
        </div>
      </div>
    </footer>
  );
}
