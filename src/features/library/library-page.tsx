import { Film, MonitorPlay, Sparkles, Tv, type LucideIcon } from "lucide-react";
import MediaRow from "@/components/app/media-row";
import { useLibrary } from "@/features/library/use-library";

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
  const { status, rows, error, reload } = useLibrary();

  return (
    <div className="flex flex-col gap-8 p-6 md:p-8">
      {rows.map((row) => (
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
