import { Loader2 } from "lucide-react";
import type { RefObject } from "react";
import type { PlaybackStatus } from "@/features/player/use-player";

type VideoSurfaceProps = {
  status: PlaybackStatus;
  stageRef: RefObject<HTMLDivElement | null>;
  onToggle: () => void;
};

export default function VideoSurface({
  status,
  stageRef,
  onToggle,
}: VideoSurfaceProps) {
  const starting = status !== "playing" && status !== "paused";

  return (
    <div
      ref={stageRef}
      onClick={onToggle}
      className="absolute inset-0 overflow-hidden bg-transparent"
    >
      {starting && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black text-center">
          <Loader2 className="size-7 animate-spin text-white/70" />
          <p className="text-sm text-white/60">
            {status === "ended" ? "Playback finished" : "Starting playback..."}
          </p>
        </div>
      )}
    </div>
  );
}
