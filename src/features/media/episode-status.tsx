import { Check, FileCheck2, FileX2, Play } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "cn";
import { episodeWatchState, type Episode } from "@/lib/types";

type EpisodeStatusProps = Pick<Episode, "fileLinked" | "progress"> & {
  className?: string;
};

export default function EpisodeStatus({
  fileLinked,
  progress,
  className,
}: EpisodeStatusProps) {
  const watchState = episodeWatchState(progress);

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-1.5 sm:justify-end",
        className,
      )}
    >
      <Badge
        variant={fileLinked ? "secondary" : "outline"}
        className={fileLinked ? undefined : "text-muted-foreground"}
      >
        {fileLinked ? <FileCheck2 /> : <FileX2 />}
        {fileLinked ? "Linked" : "Unlinked"}
      </Badge>

      {watchState === "watched" && (
        <Badge>
          <Check />
          Watched
        </Badge>
      )}

      {watchState === "in-progress" && (
        <Badge variant="secondary">
          <Play />
          In progress
        </Badge>
      )}
    </div>
  );
}
