import {
  Captions,
  CaptionsOff,
  Check,
  ChevronDown,
  Keyboard,
  ListVideo,
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
import { useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent, ReactNode } from "react";
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
import { formatRuntime, formatTimecode } from "@/lib/format";
import {
  SUBTITLE_OFF,
  type PlaybackPlaylist,
} from "@/features/player/player-mock";
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

type DockMenu = "audio" | "subtitle" | "speed" | "episodes";

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
  className,
  children,
}: {
  title: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "w-56 rounded-md border border-white/10 bg-neutral-900/95 p-1.5",
        className,
      )}
    >
      <p className="px-2 py-1 text-xs font-medium tracking-wide text-white/40 uppercase">
        {title}
      </p>
      <div className="grid max-h-48 gap-0.5 overflow-y-auto">{children}</div>
    </div>
  );
}

function EpisodesPanel({
  playlist,
  currentId,
  onSelect,
  className,
}: {
  playlist: PlaybackPlaylist;
  currentId: string;
  onSelect: (itemId: string) => void;
  className?: string;
}) {
  const currentSeasonIndex = playlist.seasons.findIndex((season) =>
    season.items.some((item) => item.id === currentId),
  );
  const [seasonIndex, setSeasonIndex] = useState(
    currentSeasonIndex >= 0 ? currentSeasonIndex : 0,
  );
  const season = playlist.seasons[seasonIndex];

  if (!season) return null;

  return (
    <div
      className={cn(
        "w-80 rounded-md border border-white/10 bg-neutral-900/95 p-2",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2 px-1 pb-2">
        <p className="text-xs font-medium tracking-wide text-white/40 uppercase">
          Episodes
        </p>
        <Select
          value={String(seasonIndex)}
          onValueChange={(value) => setSeasonIndex(Number(value))}
        >
          <SelectTrigger
            size="sm"
            aria-label="Select season"
            className="border-white/20 bg-white/5 text-white [&_svg]:text-white/60"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {playlist.seasons.map((option, index) => (
              <SelectItem key={option.seasonNumber} value={String(index)}>
                {option.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid max-h-64 gap-0.5 overflow-y-auto">
        {season.items.map((item) => {
          const isCurrent = item.id === currentId;
          const ratio =
            item.durationSeconds > 0
              ? Math.min(1, item.positionSeconds / item.durationSeconds)
              : 0;
          const progressValue = item.watched ? 1 : ratio;
          const runtime =
            item.durationSeconds > 0
              ? formatRuntime(Math.round(item.durationSeconds / 60))
              : null;

          return (
            <button
              key={item.id}
              type="button"
              disabled={!item.filePath}
              onClick={() => onSelect(item.id)}
              className={cn(
                "flex w-full flex-col gap-1.5 rounded px-2 py-1.5 text-left text-sm text-white hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40",
                isCurrent && "bg-white/10",
              )}
            >
              <span className="flex w-full items-center justify-between gap-3">
                <span className="truncate">
                  {item.subtitle ?? `Episode ${item.episodeNumber}`}
                </span>
                <span className="flex shrink-0 items-center gap-1.5 text-xs text-white/50">
                  {runtime ? <span>{runtime}</span> : null}
                  {isCurrent ? (
                    <Play className="size-3.5 fill-current text-white" />
                  ) : null}
                  {item.watched ? (
                    <Check className="size-4 text-emerald-400" />
                  ) : null}
                </span>
              </span>
              {progressValue > 0 && (
                <span className="block h-0.5 w-full overflow-hidden rounded-full bg-white/20">
                  <span
                    className={cn(
                      "block h-full rounded-full",
                      item.watched ? "bg-emerald-400" : "bg-white",
                    )}
                    style={{ width: `${progressValue * 100}%` }}
                  />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SeekBar({
  positionSeconds,
  durationSeconds,
  onSeek,
}: {
  positionSeconds: number;
  durationSeconds: number;
  onSeek: (seconds: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<{ left: number; time: number } | null>(
    null,
  );
  const seekMax = durationSeconds > 0 ? durationSeconds : 1;

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const container = containerRef.current;
    const track = container?.querySelector('[data-slot="slider-track"]');
    if (!container || !track) return;
    const trackRect = track.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const ratio = Math.min(
      1,
      Math.max(0, (event.clientX - trackRect.left) / trackRect.width),
    );
    setHover({
      left: event.clientX - containerRect.left,
      time: ratio * seekMax,
    });
  };

  return (
    <div
      ref={containerRef}
      className="group relative w-full"
      onPointerMove={handlePointerMove}
      onPointerLeave={() => setHover(null)}
    >
      <Slider
        value={[positionSeconds]}
        min={0}
        max={seekMax}
        step={1}
        aria-label="Seek"
        onValueChange={([value]) => onSeek(value)}
        className="w-full py-2 [&_[data-slot=slider-range]]:bg-white [&_[data-slot=slider-thumb]]:bg-white [&_[data-slot=slider-track]]:bg-white/20 [&_[data-slot=slider-track]]:transition-[height] group-hover:[&_[data-slot=slider-track]]:h-2"
      />
      {hover && (
        <div
          className="pointer-events-none absolute bottom-full z-30 mb-1 -translate-x-1/2 rounded bg-black/90 px-1.5 py-0.5 text-xs text-white tabular-nums shadow"
          style={{ left: hover.left }}
        >
          {formatTimecode(hover.time)}
        </div>
      )}
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
  const playlist = controller.playlist;
  const [openMenu, setOpenMenu] = useState<DockMenu | null>(null);

  if (!current) return null;

  const hasEpisodes = playlist != null && playlist.seasons.length > 0;
  const isPlaying = state.status === "playing";

  const audioLabel =
    state.audioTracks.find((track) => track.id === state.audioTrackId)?.label ??
    "Audio";
  const subtitleLabel =
    state.subtitleTracks.find((track) => track.id === state.subtitleTrackId)
      ?.label ?? "Off";
  const subtitlesOn = state.subtitleTrackId !== SUBTITLE_OFF;
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
        <SeekBar
          positionSeconds={state.positionSeconds}
          durationSeconds={state.durationSeconds}
          onSeek={commands.seekTo}
        />
        <div className="flex items-center justify-between text-xs text-white/60 tabular-nums">
          <span>{formatTimecode(state.positionSeconds)}</span>
          <span>{formatTimecode(state.durationSeconds)}</span>
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
            <div className="relative">
              <DockMenuButton
                label="Audio track"
                value={audioLabel}
                active={openMenu === "audio"}
                onClick={() => toggleMenu("audio")}
                className="w-36"
              />
              {openMenu === "audio" && (
                <MenuPanel
                  title="Audio track"
                  className="absolute right-0 bottom-full mb-2"
                >
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
            </div>
            <div className="relative">
              <DockMenuButton
                label="Subtitle track"
                value={subtitleLabel}
                active={openMenu === "subtitle"}
                onClick={() => toggleMenu("subtitle")}
                className="w-36"
              />
              {openMenu === "subtitle" && (
                <MenuPanel
                  title="Subtitle track"
                  className="absolute right-0 bottom-full mb-2"
                >
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
            </div>
            <div className="relative">
              <DockMenuButton
                label="Playback speed"
                value={speedLabel}
                active={openMenu === "speed"}
                onClick={() => toggleMenu("speed")}
                className="w-20"
              />
              {openMenu === "speed" && (
                <MenuPanel
                  title="Playback speed"
                  className="absolute right-0 bottom-full mb-2"
                >
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
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <DockButton
              label={subtitlesOn ? "Turn subtitles off" : "Turn subtitles on"}
              icon={subtitlesOn ? Captions : CaptionsOff}
              disabled={state.subtitleTracks.length === 0}
              onClick={commands.toggleSubtitles}
            />
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
            {hasEpisodes && (
              <div className="relative">
                <DockButton
                  label="Episodes"
                  icon={ListVideo}
                  onClick={() => toggleMenu("episodes")}
                />
                {openMenu === "episodes" && playlist && (
                  <EpisodesPanel
                    playlist={playlist}
                    currentId={current.id}
                    className="absolute right-0 bottom-full mb-2"
                    onSelect={(itemId) =>
                      choose(() => commands.playItem(itemId))
                    }
                  />
                )}
              </div>
            )}
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
