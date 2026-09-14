import {
  Gauge,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  type LucideIcon,
} from "lucide-react";
import type {
  FeedbackKind,
  PlayerFeedback,
} from "@/features/player/use-player";

const FEEDBACK_ICONS: Record<FeedbackKind, LucideIcon> = {
  play: Play,
  pause: Pause,
  forward: RotateCw,
  back: RotateCcw,
  volume: Volume2,
  mute: VolumeX,
  unmute: Volume2,
  rate: Gauge,
};

export default function PlayerHud({
  feedback,
}: {
  feedback: PlayerFeedback | null;
}) {
  if (!feedback) return null;

  const Icon = FEEDBACK_ICONS[feedback.kind];

  return (
    <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center">
      <div
        key={feedback.id}
        className="flex flex-col items-center gap-2 rounded-2xl bg-black/60 px-8 py-6 text-white shadow-lg backdrop-blur-sm animate-in fade-in zoom-in-95 duration-150"
      >
        <Icon className="size-10" />
        <span className="text-lg font-medium tabular-nums">
          {feedback.label}
        </span>
      </div>
    </div>
  );
}
