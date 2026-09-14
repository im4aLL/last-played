import { SkipForward, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PlaybackItem } from "@/features/player/player-mock";

type NextEpisodePromptProps = {
  open: boolean;
  next: PlaybackItem | null;
  onPlay: () => void;
  onDismiss: () => void;
};

export default function NextEpisodePrompt({
  open,
  next,
  onPlay,
  onDismiss,
}: NextEpisodePromptProps) {
  if (!open || !next) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center p-6">
      <div className="pointer-events-auto w-full max-w-sm space-y-4 rounded-xl border border-white/10 bg-neutral-900/95 p-5 text-white shadow-2xl">
        <div className="space-y-1">
          <p className="text-xs font-medium tracking-wide text-white/50 uppercase">
            Up next
          </p>
          <p className="truncate font-medium">{next.subtitle ?? next.title}</p>
          {next.subtitle && (
            <p className="truncate text-sm text-white/50">{next.title}</p>
          )}
        </div>

        <div className="flex gap-2">
          <Button size="sm" onClick={onPlay}>
            <SkipForward />
            Play next
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-white hover:bg-white/10 hover:text-white"
            onClick={onDismiss}
          >
            <X />
            Dismiss
          </Button>
        </div>
      </div>
    </div>
  );
}
