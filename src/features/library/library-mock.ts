import type { MediaItem, MediaType, WatchProgress } from "@/lib/types";

export type LibraryRow = {
  id: string;
  title: string;
  items: MediaItem[];
};

export type LibraryScenario = "default" | "empty" | "error";

export const LIBRARY_ROW_DEFS = [
  { id: "continue-watching", title: "Continue Watching" },
  { id: "recently-added", title: "Recently Added" },
  { id: "movies", title: "All Movies" },
  { id: "shows", title: "All Shows" },
] as const;

const FETCH_DELAY_MS = 350;

function media(
  id: string,
  type: MediaType,
  title: string,
  year: number,
  progress: WatchProgress | null = null,
): MediaItem {
  return { id, type, title, year, posterUrl: null, progress };
}

function watching(
  positionSeconds: number,
  durationSeconds: number,
): WatchProgress {
  return { positionSeconds, durationSeconds, watched: false };
}

const CONTINUE_WATCHING: MediaItem[] = [
  media("dark-matter", "tv", "Dark Matter", 2024, watching(1500, 3300)),
  media("severance", "tv", "Severance", 2022, watching(2100, 3000)),
  media("dune-part-two", "movie", "Dune: Part Two", 2024, watching(1200, 9900)),
  media("the-bear", "tv", "The Bear", 2022, watching(1800, 2400)),
];

const RECENTLY_ADDED: MediaItem[] = [
  media("dune-part-two", "movie", "Dune: Part Two", 2024),
  media("fallout", "tv", "Fallout", 2024),
  media("shogun", "tv", "Shogun", 2024),
  media("oppenheimer", "movie", "Oppenheimer", 2023),
  media("the-last-of-us", "tv", "The Last of Us", 2023),
  media("poor-things", "movie", "Poor Things", 2023),
];

const MOVIES: MediaItem[] = [
  media("inception", "movie", "Inception", 2010),
  media("interstellar", "movie", "Interstellar", 2014),
  media("parasite", "movie", "Parasite", 2019, {
    positionSeconds: 7920,
    durationSeconds: 7920,
    watched: true,
  }),
  media(
    "everything-everywhere",
    "movie",
    "Everything Everywhere All at Once",
    2022,
  ),
  media("blade-runner-2049", "movie", "Blade Runner 2049", 2017),
  media("arrival", "movie", "Arrival", 2016),
  media("oppenheimer", "movie", "Oppenheimer", 2023),
  media("poor-things", "movie", "Poor Things", 2023),
  media("dune-part-two", "movie", "Dune: Part Two", 2024),
];

const SHOWS: MediaItem[] = [
  media("dark-matter", "tv", "Dark Matter", 2024),
  media("severance", "tv", "Severance", 2022),
  media("the-bear", "tv", "The Bear", 2022),
  media("shogun", "tv", "Shogun", 2024),
  media("fallout", "tv", "Fallout", 2024),
  media("the-last-of-us", "tv", "The Last of Us", 2023),
  media("andor", "tv", "Andor", 2022),
  media("foundation", "tv", "Foundation", 2021),
];

const DEFAULT_ROWS: LibraryRow[] = [
  {
    id: "continue-watching",
    title: "Continue Watching",
    items: CONTINUE_WATCHING,
  },
  { id: "recently-added", title: "Recently Added", items: RECENTLY_ADDED },
  { id: "movies", title: "All Movies", items: MOVIES },
  { id: "shows", title: "All Shows", items: SHOWS },
];

const EMPTY_ROWS: LibraryRow[] = LIBRARY_ROW_DEFS.map(({ id, title }) => ({
  id,
  title,
  items: [],
}));

function delay(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function fetchLibrary(
  scenario: LibraryScenario = "default",
): Promise<LibraryRow[]> {
  await delay(FETCH_DELAY_MS);

  if (scenario === "error") {
    throw new Error("Could not reach the library. Please try again.");
  }

  const rows = scenario === "empty" ? EMPTY_ROWS : DEFAULT_ROWS;
  return rows.map((row) => ({ ...row, items: [...row.items] }));
}
