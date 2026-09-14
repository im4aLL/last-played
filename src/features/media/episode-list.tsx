import { CalendarDays, Clock, Play, Tv } from "lucide-react";
import { Link } from "react-router-dom";
import EmptyState from "@/components/app/empty-state";
import { Progress } from "@/components/ui/progress";
import EpisodeStatus from "@/features/media/episode-status";
import { formatAirDate, formatRuntime } from "@/lib/format";
import { posterHue } from "@/lib/poster";
import { progressRatio, type Episode } from "@/lib/types";

type EpisodeListProps = {
  mediaId: string;
  episodes: Episode[];
};

function EpisodeRow({
  mediaId,
  episode,
}: {
  mediaId: string;
  episode: Episode;
}) {
  const ratio = progressRatio(episode.progress);
  const runtime = formatRuntime(episode.runtimeMinutes);
  const airDate = formatAirDate(episode.airDate);
  const hue = posterHue(episode.name);
  const showProgress = ratio != null && ratio > 0;
  const resumable = showProgress && !episode.progress?.watched;

  return (
    <li className="flex flex-col gap-2 py-4 sm:flex-row sm:items-start sm:gap-4">
      <div className="group relative hidden aspect-video w-36 shrink-0 overflow-hidden rounded-md bg-muted ring-1 ring-foreground/10 sm:block">
        {episode.stillUrl ? (
          <img
            src={episode.stillUrl}
            alt=""
            loading="lazy"
            className="size-full object-cover"
          />
        ) : (
          <div
            className="flex size-full items-center justify-center"
            style={{
              backgroundImage: `linear-gradient(140deg, hsl(${hue} 40% 32%), hsl(${(hue + 48) % 360} 50% 16%))`,
            }}
          >
            <span className="font-heading text-lg font-semibold text-white/85">
              {episode.episodeNumber}
            </span>
          </div>
        )}

        {episode.videoFile && (
          <Link
            to={`/player/${mediaId}?episode=${episode.id}`}
            aria-label={`${resumable ? "Resume" : "Play"} ${episode.name}`}
            className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
          >
            <span className="flex size-10 items-center justify-center rounded-full bg-background/90 text-foreground shadow-md">
              <Play className="size-5 fill-current" />
            </span>
          </Link>
        )}

        {showProgress && (
          <Progress
            value={ratio * 100}
            className="absolute inset-x-0 bottom-0 h-1 rounded-none bg-black/50 [&>div]:bg-white"
          />
        )}
      </div>

      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-baseline gap-2">
          <span className="shrink-0 text-xs font-medium text-muted-foreground tabular-nums">
            E{String(episode.episodeNumber).padStart(2, "0")}
          </span>
          <h3 className="truncate font-heading text-sm font-medium">
            {episode.name}
          </h3>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {airDate && (
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="size-3" />
              {airDate}
            </span>
          )}
          {runtime && (
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3" />
              {runtime}
            </span>
          )}
        </div>

        {episode.overview && (
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {episode.overview}
          </p>
        )}
      </div>

      <EpisodeStatus
        mediaId={mediaId}
        episode={episode}
        className="shrink-0 sm:max-w-[22rem]"
      />
    </li>
  );
}

export default function EpisodeList({ mediaId, episodes }: EpisodeListProps) {
  if (episodes.length === 0) {
    return <EmptyState icon={Tv} title="No episodes for this season yet" />;
  }

  return (
    <ul className="divide-y">
      {episodes.map((episode) => (
        <EpisodeRow key={episode.id} mediaId={mediaId} episode={episode} />
      ))}
    </ul>
  );
}
