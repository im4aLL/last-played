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
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import EmptyState from "@/components/app/empty-state";
import MediaGrid from "@/components/app/media-grid";
import MediaRow from "@/components/app/media-row";
import { Button } from "@/components/ui/button";
import LibraryToolbar from "@/features/library/library-toolbar";
import {
  buildDashboardRows,
  DEFAULT_FILTER,
  filterLibraryItems,
  isDefaultFilter,
  useLibrary,
  type LibraryFilter,
} from "@/features/library/use-library";

const ROW_ICONS: Record<string, LucideIcon> = {
  "continue-watching": MonitorPlay,
  "recently-added": Sparkles,
  movies: Film,
  shows: Tv,
};

const EMPTY_MESSAGES: Record<string, string> = {
  "continue-watching":
    "Start watching a movie or episode and it will show up here.",
  "recently-added": "Newly added movies and shows will appear here.",
  movies: "No movies in your library yet.",
  shows: "No shows in your library yet.",
};

export default function LibraryPage() {
  const { status, items, continueWatching, error, reload } = useLibrary();
  const [filter, setFilter] = useState<LibraryFilter>(DEFAULT_FILTER);

  const filtering = !isDefaultFilter(filter);
  const results = useMemo(
    () => filterLibraryItems(items, filter),
    [items, filter],
  );
  const rows = useMemo(
    () => buildDashboardRows(continueWatching, items),
    [continueWatching, items],
  );

  if (status === "error") {
    return (
      <div className="p-6 md:p-8">
        <EmptyState
          icon={TriangleAlert}
          title="Could not load your library"
          description={error?.message ?? "Please try again."}
          action={
            <Button variant="outline" size="sm" onClick={reload}>
              Try again
            </Button>
          }
        />
      </div>
    );
  }

  const libraryEmpty =
    status === "ready" && items.length === 0 && continueWatching.length === 0;

  return (
    <div className="flex flex-col gap-6 p-6 md:p-8">
      <LibraryToolbar
        filter={filter}
        onChange={setFilter}
        resultCount={filtering ? results.length : null}
      />

      {status === "loading" && (
        <div className="flex flex-col gap-8">
          {rows.slice(0, 2).map((row) => (
            <MediaRow
              key={row.id}
              title={row.title}
              items={[]}
              status="loading"
            />
          ))}
        </div>
      )}

      {status === "ready" && libraryEmpty && (
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
      )}

      {status === "ready" && !libraryEmpty && filtering && (
        <>
          {results.length > 0 ? (
            <MediaGrid items={results} />
          ) : (
            <EmptyState
              icon={SearchX}
              title="No titles match"
              description="Try a different search term or clear the filters."
              action={
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFilter(DEFAULT_FILTER)}
                >
                  Clear filters
                </Button>
              }
            />
          )}
        </>
      )}

      {status === "ready" &&
        !libraryEmpty &&
        !filtering &&
        rows.map((row) => (
          <MediaRow
            key={row.id}
            title={row.title}
            items={row.items}
            status={status}
            errorMessage={error?.message}
            emptyMessage={EMPTY_MESSAGES[row.id]}
            emptyIcon={ROW_ICONS[row.id]}
            onRetry={reload}
          />
        ))}
    </div>
  );
}
