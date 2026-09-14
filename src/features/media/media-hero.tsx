import { Play } from "lucide-react";
import { Link } from "react-router-dom";
import PosterArt from "@/components/app/poster-art";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCount, formatRuntime } from "@/lib/format";
import { posterHue } from "@/lib/poster";
import { progressRatio, type MediaDetail } from "@/lib/types";

type MediaHeroProps = {
  detail: MediaDetail;
};

export default function MediaHero({ detail }: MediaHeroProps) {
  const runtime = formatRuntime(detail.runtimeMinutes);
  const episodeCount = detail.seasons.reduce(
    (total, season) => total + season.episodes.length,
    0,
  );
  const ratio = progressRatio(detail.progress);
  const isResumable = ratio != null && ratio > 0 && !detail.progress?.watched;
  const hue = posterHue(detail.title);

  const meta = [
    detail.year != null ? String(detail.year) : null,
    detail.type === "movie" ? "Movie" : "TV Series",
    runtime,
    detail.type === "tv" && detail.seasons.length > 0
      ? `${formatCount(detail.seasons.length, "season")}, ${formatCount(episodeCount, "episode")}`
      : null,
  ].filter((value): value is string => value != null);

  return (
    <section className="relative">
      <div className="relative h-40 overflow-hidden bg-muted md:h-60">
        {detail.backdropUrl ? (
          <img
            src={detail.backdropUrl}
            alt=""
            className="size-full object-cover"
          />
        ) : (
          <div
            className="size-full"
            style={{
              backgroundImage: `linear-gradient(120deg, hsl(${hue} 40% 30%), hsl(${(hue + 60) % 360} 45% 14%))`,
            }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/55 to-background/10" />
      </div>

      <div className="px-6 md:px-8">
        <div className="-mt-16 flex flex-col gap-5 sm:flex-row sm:gap-6 md:-mt-24">
          <PosterArt
            title={detail.title}
            posterUrl={detail.posterUrl}
            mediaType={detail.type}
            className="w-28 shrink-0 shadow-lg ring-1 ring-foreground/10 md:w-40"
          />

          <div className="min-w-0 flex-1 space-y-3 sm:pt-16 md:pt-24">
            <div className="space-y-1.5">
              <h1 className="font-heading text-2xl font-semibold tracking-tight md:text-4xl">
                {detail.title}
              </h1>
              {meta.length > 0 && (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                  {meta.map((value) => (
                    <span key={value}>{value}</span>
                  ))}
                </div>
              )}
            </div>

            {detail.genres.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {detail.genres.map((genre) => (
                  <Badge key={genre} variant="outline">
                    {genre}
                  </Badge>
                ))}
              </div>
            )}

            {detail.overview && (
              <p className="max-w-2xl text-sm text-muted-foreground md:text-base">
                {detail.overview}
              </p>
            )}

            <div className="pt-1">
              <Button asChild size="lg">
                <Link to={`/player/${detail.id}`}>
                  <Play />
                  {isResumable ? "Resume" : "Play"}
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
