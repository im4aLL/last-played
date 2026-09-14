import type {
  Episode,
  MediaDetail,
  MediaItem,
  Season,
  WatchProgress,
} from "@/lib/types";
import { MOCK_MEDIA_BY_ID } from "@/features/library/library-mock";

export type MediaScenario = "default" | "error";

const FETCH_DELAY_MS = 300;

type EpisodeSeed = {
  number: number;
  name: string;
  airDate: string;
  runtimeMinutes: number;
  overview?: string;
  linked?: boolean;
  progress?: WatchProgress | null;
};

type SeasonSeed = {
  seasonNumber: number;
  name?: string;
  episodes: EpisodeSeed[];
};

type ShowSeed = {
  overview: string;
  genres: string[];
  seasons: SeasonSeed[];
};

type MovieSeed = {
  overview: string;
  genres: string[];
  runtimeMinutes: number;
  releaseDate: string;
};

function inProgress(
  positionSeconds: number,
  durationSeconds: number,
): WatchProgress {
  return { positionSeconds, durationSeconds, watched: false };
}

function watched(durationSeconds: number): WatchProgress {
  return {
    positionSeconds: durationSeconds,
    durationSeconds,
    watched: true,
  };
}

function buildSeason(
  mediaId: string,
  { seasonNumber, name, episodes }: SeasonSeed,
): Season {
  return {
    id: `${mediaId}-s${seasonNumber}`,
    seasonNumber,
    name: name ?? `Season ${seasonNumber}`,
    episodes: episodes.map<Episode>((seed) => ({
      id: `${mediaId}-s${seasonNumber}e${seed.number}`,
      episodeNumber: seed.number,
      name: seed.name,
      overview: seed.overview ?? null,
      airDate: seed.airDate,
      runtimeMinutes: seed.runtimeMinutes,
      fileLinked: seed.linked ?? false,
      progress: seed.progress ?? null,
    })),
  };
}

const SHOW_SEEDS: Record<string, ShowSeed> = {
  "dark-matter": {
    overview:
      "Jason Dessen is abducted into an alternate version of his life and must find his way back to his true family.",
    genres: ["Science Fiction", "Thriller", "Drama"],
    seasons: [
      {
        seasonNumber: 1,
        episodes: [
          {
            number: 1,
            name: "Are You Happy in Your Life?",
            airDate: "2024-05-08",
            runtimeMinutes: 53,
            overview:
              "A physics professor is abducted and wakes up in a life that is almost, but not quite, his own.",
            linked: true,
            progress: watched(3180),
          },
          {
            number: 2,
            name: "Trip of a Lifetime",
            airDate: "2024-05-08",
            runtimeMinutes: 51,
            linked: true,
            progress: watched(3060),
          },
          {
            number: 3,
            name: "The Box",
            airDate: "2024-05-15",
            runtimeMinutes: 48,
            linked: true,
            progress: inProgress(1280, 2880),
          },
          {
            number: 4,
            name: "The Corridor",
            airDate: "2024-05-22",
            runtimeMinutes: 50,
            linked: true,
          },
          {
            number: 5,
            name: "Worlds Within Worlds",
            airDate: "2024-05-29",
            runtimeMinutes: 47,
          },
          {
            number: 6,
            name: "Superposition",
            airDate: "2024-06-05",
            runtimeMinutes: 52,
            linked: true,
            progress: inProgress(640, 3120),
          },
          {
            number: 7,
            name: "In the Fires of Dead Stars",
            airDate: "2024-06-12",
            runtimeMinutes: 49,
          },
          {
            number: 8,
            name: "Jupiter",
            airDate: "2024-06-19",
            runtimeMinutes: 50,
            linked: true,
            progress: watched(3000),
          },
          {
            number: 9,
            name: "Entanglement",
            airDate: "2024-06-26",
            runtimeMinutes: 54,
          },
        ],
      },
    ],
  },
  severance: {
    overview:
      "Mark leads a team of office workers whose memories have been surgically divided between their work and personal lives.",
    genres: ["Science Fiction", "Drama", "Mystery"],
    seasons: [
      {
        seasonNumber: 1,
        episodes: [
          {
            number: 1,
            name: "Good News About Hell",
            airDate: "2022-02-18",
            runtimeMinutes: 57,
            linked: true,
            progress: watched(3420),
          },
          {
            number: 2,
            name: "Half Loop",
            airDate: "2022-02-18",
            runtimeMinutes: 53,
            linked: true,
            progress: watched(3180),
          },
          {
            number: 3,
            name: "In Perpetuity",
            airDate: "2022-02-25",
            runtimeMinutes: 52,
            linked: true,
            progress: watched(3120),
          },
          {
            number: 4,
            name: "The You You Are",
            airDate: "2022-03-04",
            runtimeMinutes: 49,
            linked: true,
            progress: inProgress(1560, 2940),
          },
          {
            number: 5,
            name: "The Grim Barbarity of Optics and Design",
            airDate: "2022-03-11",
            runtimeMinutes: 51,
            linked: true,
          },
          {
            number: 6,
            name: "Hide and Seek",
            airDate: "2022-03-18",
            runtimeMinutes: 46,
          },
          {
            number: 7,
            name: "Defiant Jazz",
            airDate: "2022-03-25",
            runtimeMinutes: 50,
            linked: true,
          },
          {
            number: 8,
            name: "What's for Dinner?",
            airDate: "2022-04-01",
            runtimeMinutes: 48,
          },
          {
            number: 9,
            name: "The We We Are",
            airDate: "2022-04-08",
            runtimeMinutes: 46,
          },
        ],
      },
      {
        seasonNumber: 2,
        episodes: [
          {
            number: 1,
            name: "Hello, Ms. Cobel",
            airDate: "2025-01-17",
            runtimeMinutes: 58,
          },
          {
            number: 2,
            name: "Goodbye, Mrs. Selvig",
            airDate: "2025-01-24",
            runtimeMinutes: 54,
          },
          {
            number: 3,
            name: "Who Is Alive?",
            airDate: "2025-01-31",
            runtimeMinutes: 52,
          },
          {
            number: 4,
            name: "Woe's Hollow",
            airDate: "2025-02-07",
            runtimeMinutes: 56,
          },
          {
            number: 5,
            name: "Trojan's Horse",
            airDate: "2025-02-14",
            runtimeMinutes: 50,
          },
          {
            number: 6,
            name: "Attila",
            airDate: "2025-02-21",
            runtimeMinutes: 49,
          },
          {
            number: 7,
            name: "Chikhai Bardo",
            airDate: "2025-02-28",
            runtimeMinutes: 53,
          },
          {
            number: 8,
            name: "Sweet Vitriol",
            airDate: "2025-03-07",
            runtimeMinutes: 47,
          },
          {
            number: 9,
            name: "The After Hours",
            airDate: "2025-03-14",
            runtimeMinutes: 51,
          },
          {
            number: 10,
            name: "Cold Harbor",
            airDate: "2025-03-21",
            runtimeMinutes: 55,
          },
        ],
      },
    ],
  },
};

const MOVIE_SEEDS: Record<string, MovieSeed> = {
  "dune-part-two": {
    overview:
      "Paul Atreides unites with the Fremen to wage war against the House Harkonnen and confront the terrible future only he can foresee.",
    genres: ["Science Fiction", "Adventure", "Drama"],
    runtimeMinutes: 167,
    releaseDate: "2024-02-27",
  },
  inception: {
    overview:
      "A thief who steals corporate secrets through shared dreaming is offered a chance to have his past erased if he can plant an idea in a target's mind.",
    genres: ["Science Fiction", "Action", "Thriller"],
    runtimeMinutes: 148,
    releaseDate: "2010-07-16",
  },
  interstellar: {
    overview:
      "With Earth's future in doubt, a team of explorers travels through a wormhole in search of a new home for humanity.",
    genres: ["Science Fiction", "Adventure", "Drama"],
    runtimeMinutes: 169,
    releaseDate: "2014-11-05",
  },
};

const FALLBACK_EPISODE_COUNT = 4;

function fallbackSeason(item: MediaItem): Season {
  return buildSeason(item.id, {
    seasonNumber: 1,
    episodes: Array.from({ length: FALLBACK_EPISODE_COUNT }, (_, index) => ({
      number: index + 1,
      name: `Episode ${index + 1}`,
      airDate: "2024-01-01",
      runtimeMinutes: 50,
    })),
  });
}

function fallbackOverview(item: MediaItem): string {
  return `No overview is available for ${item.title} in the mock library yet.`;
}

function buildDetail(item: MediaItem): MediaDetail {
  const base: MediaDetail = {
    id: item.id,
    type: item.type,
    title: item.title,
    year: item.year,
    overview: null,
    posterUrl: item.posterUrl,
    backdropUrl: null,
    releaseDate: null,
    runtimeMinutes: null,
    genres: [],
    progress: item.progress,
    seasons: [],
  };

  if (item.type === "tv") {
    const seed = SHOW_SEEDS[item.id];
    if (seed) {
      return {
        ...base,
        overview: seed.overview,
        genres: seed.genres,
        seasons: seed.seasons.map((season) => buildSeason(item.id, season)),
      };
    }
    return {
      ...base,
      overview: fallbackOverview(item),
      seasons: [fallbackSeason(item)],
    };
  }

  const seed = MOVIE_SEEDS[item.id];
  if (seed) {
    return { ...base, ...seed };
  }

  return { ...base, overview: fallbackOverview(item) };
}

function delay(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function fetchMediaDetail(
  id: string,
  scenario: MediaScenario = "default",
): Promise<MediaDetail> {
  await delay(FETCH_DELAY_MS);

  if (scenario === "error") {
    throw new Error("Could not load this title. Please try again.");
  }

  const item = MOCK_MEDIA_BY_ID[id];
  if (!item) {
    throw new Error("This title is not in the mock library.");
  }

  return buildDetail(item);
}
