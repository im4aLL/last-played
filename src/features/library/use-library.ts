import { useQuery } from "@tanstack/react-query";
import { listMedia } from "@/lib/api";
import type { MediaItem } from "@/lib/types";

export type LibraryRow = {
  id: string;
  title: string;
  items: MediaItem[];
};

export type LibraryStatus = "loading" | "error" | "ready";

export type LibraryState = {
  status: LibraryStatus;
  rows: LibraryRow[];
  error: Error | null;
  reload: () => void;
};

const RECENTLY_ADDED_LIMIT = 12;

function buildRows(items: MediaItem[]): LibraryRow[] {
  return [
    { id: "continue-watching", title: "Continue Watching", items: [] },
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

export function useLibrary(): LibraryState {
  const query = useQuery({
    queryKey: ["media", "list"],
    queryFn: listMedia,
  });

  const status: LibraryStatus = query.isPending
    ? "loading"
    : query.isError
      ? "error"
      : "ready";

  return {
    status,
    rows: buildRows(query.data ?? []),
    error: query.error,
    reload: () => {
      void query.refetch();
    },
  };
}
