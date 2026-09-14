import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import EpisodeList from "@/features/media/episode-list";
import { formatCount } from "@/lib/format";
import type { Season } from "@/lib/types";

type SeasonSectionProps = {
  seasons: Season[];
};

export default function SeasonSection({ seasons }: SeasonSectionProps) {
  const [activeSeasonId, setActiveSeasonId] = useState(seasons[0]?.id ?? "");
  const activeSeason =
    seasons.find((season) => season.id === activeSeasonId) ?? seasons[0];

  if (!activeSeason) return null;

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 border-b pb-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="font-heading text-lg font-semibold tracking-tight">
          Episodes
        </h2>

        <Select value={activeSeason.id} onValueChange={setActiveSeasonId}>
          <SelectTrigger className="w-full sm:w-56" aria-label="Select season">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {seasons.map((season) => (
              <SelectItem key={season.id} value={season.id}>
                {season.name} ({formatCount(season.episodes.length, "episode")})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <EpisodeList episodes={activeSeason.episodes} />
    </section>
  );
}
