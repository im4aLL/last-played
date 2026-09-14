import {
  Film,
  MonitorPlay,
  PlusCircle,
  SearchX,
  Sparkles,
  TriangleAlert,
  Tv,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import EmptyState from "@/components/app/empty-state";
import MediaGrid from "@/components/app/media-grid";
import MediaRow from "@/components/app/media-row";
import { PosterCardSkeleton } from "@/components/app/poster-card";
import { Button } from "@/components/ui/button";
import LibraryToolbar from "@/features/library/library-toolbar";
import {
  DEFAULT_FILTER,
  GRID_PAGE_SIZE,
  isDefaultFilter,
  useLibrary,
  useMediaList,
  type MediaListState,
} from "@/features/library/use-library";
import type { LibraryFilter } from "@/lib/types";

const GRID_SKELETON_COUNT = 12;

type RowConfig = {
  id: string;
  title: string;
  icon: LucideIcon;
  state: MediaListState;
  emptyMessage: string;
  lazy: boolean;
};

function FilteredResults({
  state,
  onClear,
}: {
  state: MediaListState;
  onClear: () => void;
}) {
  if (state.status === "loading") {
    return (
      <div className="grid grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))] gap-x-4 gap-y-6 sm:grid-cols-[repeat(auto-fill,minmax(10rem,1fr))]">
        {Array.from({ length: GRID_SKELETON_COUNT }, (_, index) => (
          <PosterCardSkeleton key={index} />
        ))}
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <EmptyState
        icon={TriangleAlert}
        title="Could not load results"
        description={state.error?.message ?? "Please try again."}
        action={
          <Button variant="outline" size="sm" onClick={state.reload}>
            Try again
          </Button>
        }
      />
    );
  }

  if (state.items.length === 0) {
    return (
      <EmptyState
        icon={SearchX}
        title="No titles match"
        description="Try a different search term or clear the filters."
        action={
          <Button variant="outline" size="sm" onClick={onClear}>
            Clear filters
          </Button>
        }
      />
    );
  }

  return (
    <MediaGrid
      items={state.items}
      hasMore={state.hasMore}
      loadingMore={state.loadingMore}
      onLoadMore={state.loadMore}
    />
  );
}

export default function LibraryPage() {
  const [filter, setFilter] = useState<LibraryFilter>(DEFAULT_FILTER);
  const filtering = !isDefaultFilter(filter);

  const library = useLibrary(!filtering);
  const results = useMediaList(filter, GRID_PAGE_SIZE, filtering);

  const libraryEmpty =
    library.continueWatching.status === "ready" &&
    library.recentlyAdded.status === "ready" &&
    library.continueWatching.items.length === 0 &&
    library.recentlyAdded.items.length === 0;

  const rows: RowConfig[] = [
    {
      id: "continue-watching",
      title: "Continue Watching",
      icon: MonitorPlay,
      state: library.continueWatching,
      emptyMessage:
        "Start watching a movie or episode and it will show up here.",
      lazy: false,
    },
    {
      id: "recently-added",
      title: "Recently Added",
      icon: Sparkles,
      state: library.recentlyAdded,
      emptyMessage: "Newly added movies and shows will appear here.",
      lazy: false,
    },
    {
      id: "movies",
      title: "All Movies",
      icon: Film,
      state: library.movies,
      emptyMessage: "No movies in your library yet.",
      lazy: true,
    },
    {
      id: "shows",
      title: "All Shows",
      icon: Tv,
      state: library.shows,
      emptyMessage: "No shows in your library yet.",
      lazy: true,
    },
  ];

  return (
    <div className="flex flex-col gap-6 p-6 md:p-8">
      <LibraryToolbar
        filter={filter}
        onChange={setFilter}
        resultCount={
          filtering && results.status === "ready" ? results.total : null
        }
      />

      {filtering ? (
        <FilteredResults
          state={results}
          onClear={() => setFilter(DEFAULT_FILTER)}
        />
      ) : libraryEmpty ? (
        <EmptyState
          icon={Film}
          title="Your library is empty"
          description="Add a movie or show from TMDB to start building your library."
          action={
            <Button asChild size="sm">
              <Link to="/add">
                <PlusCircle />
                Add media
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-8">
          {rows.map((row) => (
            <MediaRow
              key={row.id}
              title={row.title}
              items={row.state.items}
              status={row.state.status}
              errorMessage={row.state.error?.message}
              emptyMessage={row.emptyMessage}
              emptyIcon={row.icon}
              onRetry={row.state.reload}
              hasMore={row.lazy && row.state.hasMore}
              loadingMore={row.state.loadingMore}
              onLoadMore={row.lazy ? row.state.loadMore : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}
