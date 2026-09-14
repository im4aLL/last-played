import { Loader2 } from "lucide-react";
import type { RefObject } from "react";
import { posterHue } from "@/lib/poster";
import type { PlaybackStatus } from "@/features/player/use-player";
import type { PlaybackItem } from "@/features/player/player-mock";

type VideoSurfaceProps = {
  item: PlaybackItem;
  status: PlaybackStatus;
  stageRef: RefObject<HTMLDivElement | null>;
};

export default function VideoSurface({
  item,
  status,
  stageRef,
}: VideoSurfaceProps) {
  const hue = posterHue(item.title);
  const showPlaceholder = status !== "playing";

  return (
    <div
      ref={stageRef}
      className="relative min-h-0 flex-1 overflow-hidden bg-black"
      style={{
        backgroundImage: showPlaceholder
          ? `radial-gradient(120% 120% at 50% 0%, hsl(${hue} 45% 18%), #050505 70%)`
          : undefined,
      }}
    >
      {showPlaceholder && item.backdropUrl ? (
        <img
          src={item.backdropUrl}
          alt=""
          className="absolute inset-0 size-full object-cover opacity-40"
        />
      ) : null}

      {status === "buffering" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center">
          <Loader2 className="size-7 animate-spin text-white/70" />
          <p className="text-sm text-white/60">Starting playback...</p>
        </div>
      )}
    </div>
  );
}
