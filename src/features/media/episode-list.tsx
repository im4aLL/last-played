import { CalendarDays, Clock, Tv } from "lucide-react";
import EmptyState from "@/components/app/empty-state";
import { Progress } from "@/components/ui/progress";
import EpisodeStatus from "@/features/media/episode-status";
import { formatAirDate, formatRuntime } from "@/lib/format";
import { posterHue } from "@/lib/poster";
import { progressRatio, type Episode } from "@/lib/types";

type EpisodeListProps = {
  episodes: Episode[];
};

function EpisodeRow({ episode }: { episode: Episode }) {
  const ratio = progressRatio(episode.progress);
  const runtime = formatRuntime(episode.runtimeMinutes);
  const airDate = formatAirDate(episode.airDate);
  const hue = posterHue(episode.name);
  const showProgress = ratio != null && ratio > 0;

  return (
    <li className="flex flex-col gap-2 py-4 sm:flex-row sm:items-start sm:gap-4">
      <div
        className="relative hidden aspect-video w-36 shrink-0 overflow-hidden rounded-md ring-1 ring-foreground/10 sm:block"
        style={{
          backgroundImage: `linear-gradient(140deg, hsl(${hue} 40% 32%), hsl(${(hue + 48) % 360} 50% 16%))`,
        }}
      >
        <span className="absolute inset-0 flex items-center justify-center font-heading text-lg font-semibold text-white/85">
          {episode.episodeNumber}
        </span>
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
        fileLinked={episode.fileLinked}
        progress={episode.progress}
        className="shrink-0 sm:max-w-[16rem]"
      />
    </li>
  );
}

export default function EpisodeList({ episodes }: EpisodeListProps) {
  if (episodes.length === 0) {
    return <EmptyState icon={Tv} title="No episodes for this season yet" />;
  }

  return (
    <ul className="divide-y">
      {episodes.map((episode) => (
        <EpisodeRow key={episode.id} episode={episode} />
      ))}
    </ul>
  );
}
