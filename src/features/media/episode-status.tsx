import { Check, FileCheck2, FileX2, Play } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "cn";
import LinkFileButton from "@/features/linking/link-file-button";
import LinkedFile from "@/features/linking/linked-file";
import { episodeWatchState, type Episode } from "@/lib/types";

type EpisodeStatusProps = {
  mediaId: string;
  episode: Episode;
  className?: string;
};

export default function EpisodeStatus({
  mediaId,
  episode,
  className,
}: EpisodeStatusProps) {
  const watchState = episodeWatchState(episode.progress);

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-1.5 sm:justify-end",
        className,
      )}
    >
      {episode.videoFile && (
        <Button asChild size="xs" variant="secondary">
          <Link to={`/player/${mediaId}?episode=${episode.id}`}>
            <Play />
            Play
          </Link>
        </Button>
      )}

      <Badge
        variant={episode.fileLinked ? "secondary" : "outline"}
        className={episode.fileLinked ? undefined : "text-muted-foreground"}
      >
        {episode.fileLinked ? <FileCheck2 /> : <FileX2 />}
        {episode.fileLinked ? "Linked" : "Unlinked"}
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

      {episode.videoFile ? (
        <LinkedFile mediaId={mediaId} file={episode.videoFile} />
      ) : (
        <LinkFileButton mediaId={mediaId} episodeId={episode.id} />
      )}
    </div>
  );
}
