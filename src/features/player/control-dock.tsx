import {
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
import type { ReactNode } from "react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

function DockSelect({
  label,
  value,
  options,
  onValueChange,
  className,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onValueChange: (value: string) => void;
  className?: string;
}) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger
        size="sm"
        aria-label={label}
        className={cn(
          "border-white/20 bg-white/5 text-white hover:bg-white/10",
          className,
        )}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
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

  if (!current) return null;

  const isPlaying = state.status === "playing";
  const seekMax = state.durationSeconds > 0 ? state.durationSeconds : 1;

  const audioOptions = current.audioTracks.map((track) => ({
    value: track.id,
    label: track.label,
  }));
  const subtitleOptions = [
    { value: SUBTITLE_OFF, label: "Subtitles off" },
    ...current.subtitleTracks.map((track) => ({
      value: track.id,
      label: track.label,
    })),
  ];

  return (
    <footer
      className={cn(
        "absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/95 via-black/70 to-transparent px-4 pt-12 pb-4 transition-all duration-200",
        state.dockVisible
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-3 opacity-0",
      )}
      onPointerMove={commands.notifyActivity}
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-2">
        <div className="flex items-center gap-3">
          <span className="w-14 text-right text-xs text-white/60 tabular-nums">
            {formatTimecode(state.positionSeconds)}
          </span>
          <Slider
            value={[state.positionSeconds]}
            min={0}
            max={seekMax}
            step={1}
            aria-label="Seek"
            onValueChange={([value]) => commands.seekTo(value)}
            className="flex-1 [&_[data-slot=slider-range]]:bg-white [&_[data-slot=slider-thumb]]:bg-white [&_[data-slot=slider-track]]:bg-white/20"
          />
          <span className="w-14 text-xs text-white/60 tabular-nums">
            {formatTimecode(state.durationSeconds)}
          </span>
        </div>

        <div className="flex items-center gap-2">
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

          <div className="min-w-0 flex-1 px-2">
            <p className="truncate text-sm font-medium text-white">
              {current.subtitle ?? current.title}
            </p>
            {current.subtitle && (
              <p className="truncate text-xs text-white/50">{current.title}</p>
            )}
          </div>

          <div className="hidden items-center gap-1.5 lg:flex">
            <DockSelect
              label="Audio track"
              value={state.audioTrackId}
              options={audioOptions}
              onValueChange={commands.selectAudioTrack}
              className="w-36"
            />
            <DockSelect
              label="Subtitle track"
              value={state.subtitleTrackId}
              options={subtitleOptions}
              onValueChange={commands.selectSubtitleTrack}
              className="w-36"
            />
            <DockSelect
              label="Playback speed"
              value={String(state.rate)}
              options={RATE_OPTIONS.map((rate) => ({
                value: String(rate),
                label: `${rate}x`,
              }))}
              onValueChange={(value) => commands.setRate(Number(value))}
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
