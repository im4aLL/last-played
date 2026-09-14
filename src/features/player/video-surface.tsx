import { Pause, Play, VolumeX } from "lucide-react";
import { cn } from "cn";
import { posterHue } from "@/lib/poster";
import type { PlaybackStatus } from "@/features/player/use-player";
import type { PlaybackItem } from "@/features/player/player-mock";

type VideoSurfaceProps = {
  item: PlaybackItem;
  status: PlaybackStatus;
  rate: number;
  muted: boolean;
  onTogglePlay: () => void;
};

export default function VideoSurface({
  item,
  status,
  rate,
  muted,
  onTogglePlay,
}: VideoSurfaceProps) {
  const hue = posterHue(item.title);
  const isPlaying = status === "playing";

  return (
    <button
      type="button"
      onClick={onTogglePlay}
      aria-label={isPlaying ? "Pause" : "Play"}
      className="group relative flex size-full items-center justify-center overflow-hidden focus-visible:outline-none"
      style={{
        backgroundImage: `radial-gradient(120% 120% at 50% 0%, hsl(${hue} 45% 22%), #050505 70%)`,
      }}
    >
      {item.backdropUrl ? (
        <img
          src={item.backdropUrl}
          alt=""
          className="absolute inset-0 size-full object-cover opacity-60"
        />
      ) : null}

      <span className="pointer-events-none absolute inset-4 rounded-xl border border-dashed border-white/15" />

      <span className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-4 text-left">
        <span className="min-w-0">
          <span className="block truncate font-heading text-sm font-medium text-white/90 md:text-base">
            {item.subtitle ?? item.title}
          </span>
          {item.subtitle && (
            <span className="block truncate text-xs text-white/50">
              {item.title}
            </span>
          )}
        </span>
        <span className="flex shrink-0 items-center gap-2">
          {rate !== 1 && (
            <span className="rounded-md bg-white/10 px-2 py-0.5 text-xs font-medium text-white/80 tabular-nums">
              {rate.toFixed(2).replace(/\.?0+$/, "")}x
            </span>
          )}
          {muted && (
            <span className="rounded-md bg-white/10 p-1 text-white/80">
              <VolumeX className="size-3.5" />
            </span>
          )}
        </span>
      </span>

      <span
        className={cn(
          "pointer-events-none flex flex-col items-center gap-3 text-center transition-opacity",
          isPlaying ? "opacity-0 group-hover:opacity-100" : "opacity-100",
        )}
      >
        <span className="flex size-16 items-center justify-center rounded-full bg-white/10 text-white ring-1 ring-white/20 backdrop-blur-sm transition-transform group-hover:scale-105">
          {isPlaying ? (
            <Pause className="size-7" />
          ) : (
            <Play className="size-7 translate-x-0.5" />
          )}
        </span>
        <span className="space-y-1">
          <span className="block text-xs font-medium tracking-wide text-white/40 uppercase">
            Reserved video surface
          </span>
          <span className="block text-xs text-white/30">
            Mock playback - libVLC will render here
          </span>
        </span>
      </span>
    </button>
  );
}
