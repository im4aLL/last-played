import { useQuery } from "@tanstack/react-query";
import { continueWatching, listMedia } from "@/lib/api";
import type { MediaItem } from "@/lib/types";

export type LibraryStatus = "loading" | "error" | "ready";

export type LibraryRow = {
  id: string;
  title: string;
  items: MediaItem[];
};

export type LibraryData = {
  status: LibraryStatus;
  items: MediaItem[];
  continueWatching: MediaItem[];
  error: Error | null;
  reload: () => void;
};

export type MediaTypeFilter = "all" | "movie" | "tv";
export type WatchFilter = "all" | "unwatched" | "in-progress" | "watched";
export type LibrarySort = "recent" | "title";

export type LibraryFilter = {
  query: string;
  type: MediaTypeFilter;
  watch: WatchFilter;
  sort: LibrarySort;
};

export const DEFAULT_FILTER: LibraryFilter = {
  query: "",
  type: "all",
  watch: "all",
  sort: "recent",
};

const RECENTLY_ADDED_LIMIT = 12;

export function buildDashboardRows(
  continueItems: MediaItem[],
  items: MediaItem[],
): LibraryRow[] {
  return [
    {
      id: "continue-watching",
      title: "Continue Watching",
      items: continueItems,
    },
    {
      id: "recently-added",
      title: "Recently Added",
      items: items.slice(0, RECENTLY_ADDED_LIMIT),
    },
    {
      id: "movies",
      title: "All Movies",
      items: items.filter((item) => item.type === "movie"),
    },
    {
      id: "shows",
      title: "All Shows",
      items: items.filter((item) => item.type === "tv"),
    },
  ];
}

export function isDefaultFilter(filter: LibraryFilter): boolean {
  return (
    filter.query.trim() === "" &&
    filter.type === "all" &&
    filter.watch === "all"
  );
}

function matchesWatch(item: MediaItem, watch: WatchFilter): boolean {
  const progress = item.progress;
  switch (watch) {
    case "all":
      return true;
    case "watched":
      return progress?.watched ?? false;
    case "in-progress":
      return Boolean(
        progress && !progress.watched && progress.positionSeconds > 0,
      );
    case "unwatched":
      return !progress || (!progress.watched && progress.positionSeconds <= 0);
  }
}

/**
 * Filters and sorts in-memory. The incoming list is already ordered by
 * recently added, so the "recent" sort preserves the original order.
 */
export function filterLibraryItems(
  items: MediaItem[],
  filter: LibraryFilter,
): MediaItem[] {
  const query = filter.query.trim().toLowerCase();
  const matched = items.filter((item) => {
    if (filter.type !== "all" && item.type !== filter.type) return false;
    if (!matchesWatch(item, filter.watch)) return false;
    if (query && !item.title.toLowerCase().includes(query)) return false;
    return true;
  });

  if (filter.sort === "title") {
    return [...matched].sort((a, b) =>
      a.title.localeCompare(b.title, undefined, { sensitivity: "base" }),
    );
  }
  return matched;
}

export function useLibrary(): LibraryData {
  const query = useQuery({
    queryKey: ["media", "list"],
    queryFn: listMedia,
  });
  const continueQuery = useQuery({
    queryKey: ["media", "continue-watching"],
    queryFn: continueWatching,
  });

  const status: LibraryStatus =
    query.isPending || continueQuery.isPending
      ? "loading"
      : query.isError || continueQuery.isError
        ? "error"
        : "ready";

  return {
    status,
    items: query.data ?? [],
    continueWatching: continueQuery.data ?? [],
    error: query.error ?? continueQuery.error,
    reload: () => {
      void query.refetch();
      void continueQuery.refetch();
    },
  };
}
