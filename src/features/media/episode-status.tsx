import { Check, Play } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "cn";
import LinkFileButton from "@/features/linking/link-file-button";
import LinkedFile from "@/features/linking/linked-file";
import { useSetWatched } from "@/features/media/use-watched";
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
  const watched = episode.progress?.watched ?? false;
  const setWatched = useSetWatched();

  const stateControl =
    watchState === "in-progress"
      ? { variant: "outline" as const, label: "In progress", icon: Play }
      : watchState === "watched"
        ? { variant: "outline" as const, label: "Watched", icon: Check }
        : { variant: "ghost" as const, label: "Mark watched", icon: Check };
  const StateIcon = stateControl.icon;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-1.5 sm:justify-end",
        className,
      )}
    >
      {episode.videoFile && (
        <Button asChild size="xs" variant="default">
          <Link to={`/player/${mediaId}?episode=${episode.id}`}>
            <Play />
            {watchState === "in-progress" ? "Resume" : "Play"}
          </Link>
        </Button>
      )}

      <Button
        type="button"
        size="xs"
        variant={stateControl.variant}
        title={watched ? "Mark as unwatched" : "Mark as watched"}
        aria-label={watched ? "Mark as unwatched" : "Mark as watched"}
        disabled={setWatched.isPending}
        onClick={() =>
          setWatched.mutate({
            mediaId,
            episodeId: episode.id,
            watched: !watched,
          })
        }
      >
        <StateIcon />
        {stateControl.label}
      </Button>

      {episode.videoFile ? (
        <LinkedFile mediaId={mediaId} file={episode.videoFile} />
      ) : (
        <LinkFileButton mediaId={mediaId} episodeId={episode.id} />
      )}
    </div>
  );
}
