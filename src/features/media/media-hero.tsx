import { Check, Play, Trash2, Undo2 } from "lucide-react";
import { Link } from "react-router-dom";
import PosterArt from "@/components/app/poster-art";
import RatingBadge from "@/components/app/rating-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import LinkFileButton from "@/features/linking/link-file-button";
import LinkedFile from "@/features/linking/linked-file";
import ScanFolderButton from "@/features/linking/scan-folder-button";
import RefreshMetadataButton from "@/features/media/refresh-metadata-button";
import { useSetWatched } from "@/features/media/use-watched";
import { formatCount, formatRuntime } from "@/lib/format";
import { selectOnline, useConnection } from "@/lib/connection";
import { posterHue } from "@/lib/poster";
import { progressRatio, type MediaDetail } from "@/lib/types";

type MediaHeroProps = {
  detail: MediaDetail;
  onRemove: () => void;
};

export default function MediaHero({ detail, onRemove }: MediaHeroProps) {
  const online = useConnection(selectOnline);
  const runtime = formatRuntime(detail.runtimeMinutes);
  const episodeCount = detail.seasons.reduce(
    (total, season) => total + season.episodes.length,
    0,
  );
  const ratio = progressRatio(detail.progress);
  const isResumable = ratio != null && ratio > 0 && !detail.progress?.watched;
  const resume = detail.resume;
  const watched = detail.progress?.watched ?? false;
  const setWatched = useSetWatched();
  const hue = posterHue(detail.title);
  const playHref = resume
    ? `/player/${detail.id}?episode=${resume.episodeId}`
    : `/player/${detail.id}`;
  const playLabel = resume
    ? `Resume S${String(resume.seasonNumber).padStart(2, "0")}E${String(resume.episodeNumber).padStart(2, "0")}`
    : isResumable
      ? "Resume"
      : "Play";

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
      <div className="relative h-96 overflow-hidden bg-muted md:h-[30rem] lg:h-[34rem]">
        {detail.backdropUrl && online ? (
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
              {(meta.length > 0 || detail.voteAverage != null) && (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                  {meta.map((value) => (
                    <span key={value}>{value}</span>
                  ))}
                  <RatingBadge
                    value={detail.voteAverage}
                    className="text-foreground"
                  />
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

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Button asChild size="lg" title={resume?.name}>
                <Link to={playHref}>
                  <Play />
                  {playLabel}
                </Link>
              </Button>

              {detail.type === "movie" && (
                <Button
                  variant="outline"
                  size="lg"
                  disabled={setWatched.isPending}
                  onClick={() =>
                    setWatched.mutate({ mediaId: detail.id, watched: !watched })
                  }
                >
                  {watched ? <Undo2 /> : <Check />}
                  {watched ? "Mark unwatched" : "Mark watched"}
                </Button>
              )}

              {detail.type === "movie" &&
                (detail.videoFile ? (
                  <LinkedFile mediaId={detail.id} file={detail.videoFile} />
                ) : (
                  <LinkFileButton mediaId={detail.id} size="lg" />
                ))}

              {detail.type === "tv" && detail.seasons.length > 0 && (
                <ScanFolderButton
                  mediaId={detail.id}
                  seasons={detail.seasons}
                />
              )}

              <RefreshMetadataButton mediaId={detail.id} className="ml-auto" />

              <Button
                type="button"
                variant="destructive"
                size="lg"
                onClick={onRemove}
              >
                <Trash2 />
                Remove
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
