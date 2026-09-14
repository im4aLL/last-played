import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DEFAULT_FILTER,
  isDefaultFilter,
  type LibraryFilter,
  type LibrarySort,
  type MediaTypeFilter,
  type WatchFilter,
} from "@/features/library/use-library";
import { formatCount } from "@/lib/format";

type LibraryToolbarProps = {
  filter: LibraryFilter;
  onChange: (filter: LibraryFilter) => void;
  resultCount: number | null;
};

export default function LibraryToolbar({
  filter,
  onChange,
  resultCount,
}: LibraryToolbarProps) {
  const update = (patch: Partial<LibraryFilter>) =>
    onChange({ ...filter, ...patch });
  const filtering = !isDefaultFilter(filter);

  return (
    <section className="flex flex-col gap-3">
      <div className="relative max-w-xl">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={filter.query}
          onChange={(event) => update({ query: event.target.value })}
          placeholder="Search your library"
          aria-label="Search your library"
          className="h-9 pr-9 pl-9"
        />
        {filter.query.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Clear search"
            onClick={() => update({ query: "" })}
            className="absolute top-1/2 right-1 -translate-y-1/2"
          >
            <X />
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={filter.type}
          onValueChange={(value) => update({ type: value as MediaTypeFilter })}
        >
          <SelectTrigger
            size="sm"
            className="w-full sm:w-36"
            aria-label="Filter by type"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="movie">Movies</SelectItem>
            <SelectItem value="tv">Shows</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filter.watch}
          onValueChange={(value) => update({ watch: value as WatchFilter })}
        >
          <SelectTrigger
            size="sm"
            className="w-full sm:w-40"
            aria-label="Filter by watch status"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any status</SelectItem>
            <SelectItem value="unwatched">Unwatched</SelectItem>
            <SelectItem value="in-progress">In progress</SelectItem>
            <SelectItem value="watched">Watched</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filter.sort}
          onValueChange={(value) => update({ sort: value as LibrarySort })}
        >
          <SelectTrigger
            size="sm"
            className="w-full sm:w-44"
            aria-label="Sort library"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Recently added</SelectItem>
            <SelectItem value="title">Title A-Z</SelectItem>
          </SelectContent>
        </Select>

        {filtering && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange(DEFAULT_FILTER)}
          >
            Clear filters
          </Button>
        )}

        {resultCount != null && (
          <span className="ml-auto text-xs text-muted-foreground">
            {formatCount(resultCount, "result")}
          </span>
        )}
      </div>
    </section>
  );
}
