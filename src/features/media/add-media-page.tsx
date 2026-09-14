import { useQueryClient } from "@tanstack/react-query";
import {
  Check,
  Loader2,
  PlusCircle,
  Search,
  TriangleAlert,
} from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { cn } from "cn";
import EmptyState from "@/components/app/empty-state";
import PosterArt from "@/components/app/poster-art";
import RatingBadge from "@/components/app/rating-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { addMediaFromTmdb, previewTmdbMedia, searchTmdb } from "@/lib/api";
import { useAppConfig } from "@/lib/app-config";
import { errorMessage } from "@/lib/errors";
import { formatAirDate, formatCount, formatRuntime } from "@/lib/format";
import type { AddedMedia, MediaPreview, TmdbSearchResult } from "@/lib/types";

type SearchState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; results: TmdbSearchResult[] }
  | { status: "error"; error: string };

type PreviewState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; preview: MediaPreview }
  | { status: "error"; error: string };

function SearchResultCard({
  result,
  active,
  onSelect,
}: {
  result: TmdbSearchResult;
  active: boolean;
  onSelect: (result: TmdbSearchResult) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(result)}
      aria-pressed={active}
      className={cn(
        "flex flex-col overflow-hidden rounded-xl border text-left transition-colors",
        active
          ? "border-primary bg-primary/5 ring-2 ring-primary/30"
          : "border-border hover:bg-muted",
      )}
    >
      <PosterArt
        title={result.title}
        posterUrl={result.posterUrl}
        mediaType={result.mediaType}
        className="w-full rounded-none"
      />
      <div className="flex flex-1 flex-col gap-2 p-3">
        <span className="font-heading line-clamp-2 leading-snug font-semibold">
          {result.title}
        </span>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="shrink-0 capitalize">
            {result.mediaType === "tv" ? "TV" : "Movie"}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {result.year ?? "Unknown year"}
          </span>
          <RatingBadge value={result.voteAverage} className="ml-auto text-xs" />
        </div>
      </div>
    </button>
  );
}

function PreviewSkeleton() {
  return (
    <div className="flex gap-4">
      <Skeleton className="aspect-[2/3] w-36 shrink-0 rounded-lg" />
      <div className="min-w-0 flex-1 space-y-3">
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-9 w-32" />
      </div>
    </div>
  );
}

function SeasonList({ preview }: { preview: MediaPreview }) {
  if (preview.seasons.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No seasons were returned by TMDB for this show.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {preview.seasons.map((season) => (
        <details
          key={season.seasonNumber}
          className="rounded-lg border border-border"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-3 text-sm font-medium">
            <span>{season.name}</span>
            <span className="text-xs text-muted-foreground">
              {formatCount(season.episodeCount, "episode")}
            </span>
          </summary>
          <Separator />
          <ul className="divide-y divide-border">
            {season.episodes.map((episode) => (
              <li
                key={episode.episodeNumber}
                className="flex items-start gap-3 p-3"
              >
                <span className="w-6 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                  {episode.episodeNumber}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{episode.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {[
                      formatAirDate(episode.airDate),
                      formatRuntime(episode.runtime),
                    ]
                      .filter(Boolean)
                      .join(" - ") || "No air date"}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </details>
      ))}
    </div>
  );
}

function PreviewPanel({
  preview,
  adding,
  addError,
  onConfirm,
}: {
  preview: MediaPreview;
  adding: boolean;
  addError: string | null;
  onConfirm: () => void;
}) {
  const meta = [
    preview.year != null ? String(preview.year) : null,
    preview.mediaType === "tv" ? "TV Series" : "Movie",
    formatRuntime(preview.runtime),
    preview.mediaType === "tv"
      ? `${formatCount(preview.seasonCount, "season")}, ${formatCount(preview.episodeCount, "episode")}`
      : null,
  ].filter((value): value is string => value != null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Confirm</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex gap-4">
          <PosterArt
            title={preview.title}
            posterUrl={preview.posterUrl}
            mediaType={preview.mediaType}
            className="w-40 shrink-0 shadow-md ring-1 ring-foreground/10 sm:w-48"
          />
          <div className="min-w-0 flex-1 space-y-2">
            <h2 className="font-heading text-xl font-semibold tracking-tight">
              {preview.title}
            </h2>
            {meta.length > 0 && (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                {meta.map((value) => (
                  <span key={value}>{value}</span>
                ))}
              </div>
            )}
            {preview.overview && (
              <p className="line-clamp-4 text-sm text-muted-foreground">
                {preview.overview}
              </p>
            )}
          </div>
        </div>

        {preview.mediaType === "tv" && <SeasonList preview={preview} />}

        {addError && (
          <p
            role="alert"
            className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {addError}
          </p>
        )}

        <Button type="button" onClick={onConfirm} disabled={adding}>
          {adding ? (
            <>
              <Loader2 className="animate-spin" />
              Adding...
            </>
          ) : (
            <>
              <PlusCircle />
              Add to library
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

function AddedPanel({
  added,
  onAddAnother,
}: {
  added: AddedMedia;
  onAddAnother: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Check className="size-4 text-primary" />
          {added.refreshed ? "Metadata updated" : "Added to library"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-4">
          <PosterArt
            title={added.title}
            posterUrl={added.posterUrl}
            mediaType={added.mediaType}
            className="w-28 shrink-0 ring-1 ring-foreground/10 sm:w-32"
          />
          <div className="min-w-0 flex-1 space-y-1">
            <p className="font-heading text-lg font-semibold">{added.title}</p>
            <p className="text-sm text-muted-foreground">
              {added.year ?? "Unknown year"} -{" "}
              {added.mediaType === "tv"
                ? `${formatCount(added.seasonCount, "season")}, ${formatCount(added.episodeCount, "episode")}`
                : "Movie"}
            </p>
          </div>
        </div>
        <Button type="button" variant="outline" onClick={onAddAnother}>
          Add another title
        </Button>
      </CardContent>
    </Card>
  );
}

export default function AddMediaPage() {
  const tmdbApiKey = useAppConfig((state) => state.tmdbApiKey);
  const queryClient = useQueryClient();

  const [query, setQuery] = useState("");
  const [search, setSearch] = useState<SearchState>({ status: "idle" });
  const [selected, setSelected] = useState<TmdbSearchResult | null>(null);
  const [preview, setPreview] = useState<PreviewState>({ status: "idle" });
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [added, setAdded] = useState<AddedMedia | null>(null);

  const handleSearch = async (event: FormEvent) => {
    event.preventDefault();
    if (query.trim().length === 0) return;

    setSearch({ status: "loading" });
    setSelected(null);
    setPreview({ status: "idle" });
    setAdded(null);
    setAddError(null);

    try {
      const results = await searchTmdb(query);
      setSearch({ status: "ready", results });
    } catch (cause) {
      setSearch({ status: "error", error: errorMessage(cause) });
    }
  };

  const handleSelect = async (result: TmdbSearchResult) => {
    setSelected(result);
    setAdded(null);
    setAddError(null);
    setPreview({ status: "loading" });

    try {
      const data = await previewTmdbMedia(result.mediaType, result.tmdbId);
      setPreview({ status: "ready", preview: data });
    } catch (cause) {
      setPreview({ status: "error", error: errorMessage(cause) });
    }
  };

  const handleConfirm = async () => {
    if (!selected) return;
    setAdding(true);
    setAddError(null);

    try {
      const result = await addMediaFromTmdb(
        selected.mediaType,
        selected.tmdbId,
      );
      setAdded(result);
      setPreview({ status: "idle" });
      await queryClient.invalidateQueries({ queryKey: ["media"] });
    } catch (cause) {
      setAddError(errorMessage(cause));
    } finally {
      setAdding(false);
    }
  };

  const handleAddAnother = () => {
    setAdded(null);
    setSelected(null);
    setPreview({ status: "idle" });
    setAddError(null);
  };

  return (
    <div className="w-full space-y-6 p-6 md:p-8">
      <header className="space-y-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Add media
        </h1>
        <p className="text-sm text-muted-foreground">
          Search TMDB for a movie or show and add it to your library.
        </p>
      </header>

      {!tmdbApiKey ? (
        <EmptyState
          icon={TriangleAlert}
          title="TMDB API key required"
          description="Add your TMDB API key in Settings to search for movies and shows."
          action={
            <Button asChild variant="outline" size="sm">
              <Link to="/settings">Open Settings</Link>
            </Button>
          }
        />
      ) : (
        <>
          <form onSubmit={handleSearch} className="flex gap-2">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search movies and TV shows"
              aria-label="Search TMDB"
            />
            <Button type="submit" disabled={search.status === "loading"}>
              {search.status === "loading" ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Search />
              )}
              Search
            </Button>
          </form>

          {search.status === "error" && (
            <p
              role="alert"
              className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {search.error}
            </p>
          )}

          {added && (
            <AddedPanel added={added} onAddAnother={handleAddAnother} />
          )}

          {!added && search.status === "ready" && (
            <div className="space-y-3">
              <h2 className="font-heading text-sm font-medium text-muted-foreground">
                {search.results.length > 0
                  ? `${formatCount(search.results.length, "result")}`
                  : "No results"}
              </h2>
              <div
                className={cn(
                  "grid items-start gap-6",
                  preview.status !== "idle" &&
                    "xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]",
                )}
              >
                <div>
                  {search.results.length === 0 ? (
                    <EmptyState
                      title="Nothing matched that search"
                      description="Try a different title."
                    />
                  ) : (
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] gap-4">
                      {search.results.map((result) => (
                        <SearchResultCard
                          key={`${result.mediaType}-${result.tmdbId}`}
                          result={result}
                          active={
                            selected?.tmdbId === result.tmdbId &&
                            selected.mediaType === result.mediaType
                          }
                          onSelect={handleSelect}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {preview.status !== "idle" && (
                  <div>
                    {preview.status === "loading" && <PreviewSkeleton />}
                    {preview.status === "error" && (
                      <p
                        role="alert"
                        className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                      >
                        {preview.error}
                      </p>
                    )}
                    {preview.status === "ready" && (
                      <PreviewPanel
                        preview={preview.preview}
                        adding={adding}
                        addError={addError}
                        onConfirm={handleConfirm}
                      />
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
