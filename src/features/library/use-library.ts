import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useCallback } from "react";
import { continueWatching, listMedia } from "@/lib/api";
import { toError } from "@/lib/errors";
import type { LibraryFilter, MediaItem } from "@/lib/types";

export type LibraryStatus = "loading" | "error" | "ready";

export type MediaListState = {
  status: LibraryStatus;
  items: MediaItem[];
  total: number;
  hasMore: boolean;
  loadingMore: boolean;
  error: Error | null;
  loadMore: () => void;
  reload: () => void;
};

export type LibraryData = {
  continueWatching: MediaListState;
  recentlyAdded: MediaListState;
  movies: MediaListState;
  shows: MediaListState;
  reload: () => void;
};

export const DEFAULT_FILTER: LibraryFilter = {
  query: "",
  type: "all",
  watch: "all",
  sort: "recent",
};

const RECENTLY_ADDED_LIMIT = 12;
export const ROW_PAGE_SIZE = 24;
export const GRID_PAGE_SIZE = 30;

export function isDefaultFilter(filter: LibraryFilter): boolean {
  return (
    filter.query.trim() === "" &&
    filter.type === "all" &&
    filter.watch === "all"
  );
}

function errorFrom(error: unknown): Error | null {
  return error == null ? null : toError(error);
}

/**
 * Paginated, server-filtered media list. The backend owns filtering, sorting,
 * and paging, so `total` counts every match, not just the loaded pages.
 */
export function useMediaList(
  filter: LibraryFilter,
  pageSize: number,
  enabled = true,
): MediaListState {
  const normalized: LibraryFilter = { ...filter, query: filter.query.trim() };
  const query = useInfiniteQuery({
    queryKey: ["media", "list", normalized, pageSize],
    enabled,
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      listMedia({ filter: normalized, limit: pageSize, offset: pageParam }),
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.items.length === 0) return undefined;
      const loaded = allPages.reduce(
        (count, page) => count + page.items.length,
        0,
      );
      return loaded < lastPage.total ? loaded : undefined;
    },
  });

  const { hasNextPage, isFetchingNextPage, fetchNextPage, refetch } = query;

  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return {
    status: query.isPending ? "loading" : query.isError ? "error" : "ready",
    items: query.data?.pages.flatMap((page) => page.items) ?? [],
    total: query.data?.pages[0]?.total ?? 0,
    hasMore: hasNextPage,
    loadingMore: isFetchingNextPage,
    error: errorFrom(query.error),
    loadMore,
    reload: () => {
      void refetch();
    },
  };
}

function useContinueWatching(): MediaListState {
  const query = useQuery({
    queryKey: ["media", "continue-watching"],
    queryFn: continueWatching,
  });

  return {
    status: query.isPending ? "loading" : query.isError ? "error" : "ready",
    items: query.data ?? [],
    total: query.data?.length ?? 0,
    hasMore: false,
    loadingMore: false,
    error: errorFrom(query.error),
    loadMore: () => {},
    reload: () => {
      void query.refetch();
    },
  };
}

export function useLibrary(enabled = true): LibraryData {
  const continueWatching = useContinueWatching();
  const recentlyAdded = useMediaList(
    DEFAULT_FILTER,
    RECENTLY_ADDED_LIMIT,
    enabled,
  );
  const movies = useMediaList(
    { ...DEFAULT_FILTER, type: "movie" },
    ROW_PAGE_SIZE,
    enabled,
  );
  const shows = useMediaList(
    { ...DEFAULT_FILTER, type: "tv" },
    ROW_PAGE_SIZE,
    enabled,
  );

  return {
    continueWatching,
    recentlyAdded,
    movies,
    shows,
    reload: () => {
      continueWatching.reload();
      recentlyAdded.reload();
      movies.reload();
      shows.reload();
    },
  };
}
