import { useState, type ReactNode } from "react";
import { FileVideo, Link2, Loader2, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useScanFolder } from "@/features/linking/use-scan";
import type { ScanMatch, ScanProposal } from "@/lib/types";

export type EpisodeOption = {
  id: string;
  label: string;
};

type ScanPreviewSheetProps = {
  mediaId: string;
  proposal: ScanProposal;
  episodes: EpisodeOption[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type Row = {
  path: string;
  fileName: string;
  episodeId: string;
  notes: string[];
  conflict: boolean;
  auto: boolean;
  included: boolean;
};

function toRow(match: ScanMatch, auto: boolean): Row {
  return {
    path: match.path,
    fileName: match.fileName,
    episodeId: match.episodeId,
    notes: match.notes,
    conflict: match.conflict,
    auto,
    included: auto,
  };
}

function errorText(error: unknown): string | null {
  if (!error) return null;
  return error instanceof Error ? error.message : String(error);
}

function MatchRow({
  row,
  episodes,
  onToggle,
  onChangeEpisode,
}: {
  row: Row;
  episodes: EpisodeOption[];
  onToggle: (included: boolean) => void;
  onChangeEpisode: (episodeId: string) => void;
}) {
  return (
    <li className="flex items-start gap-3 rounded-lg border p-3">
      <Checkbox
        className="mt-0.5"
        checked={row.included}
        onCheckedChange={(value) => onToggle(value === true)}
        aria-label={`Link ${row.fileName}`}
      />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <FileVideo className="size-3.5 shrink-0 text-muted-foreground" />
          <span className="truncate text-sm" title={row.path}>
            {row.fileName}
          </span>
          {row.conflict && <Badge variant="destructive">Conflict</Badge>}
        </div>

        <Select value={row.episodeId} onValueChange={onChangeEpisode}>
          <SelectTrigger size="sm" className="w-full" aria-label="Episode">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {episodes.map((episode) => (
              <SelectItem key={episode.id} value={episode.id}>
                {episode.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {row.notes.length > 0 && (
          <p className="text-xs text-muted-foreground">
            {row.notes.join(" - ")}
          </p>
        )}
      </div>
    </li>
  );
}

function ListSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-2">
      <div className="space-y-0.5">
        <h3 className="font-heading text-sm font-medium">{title}</h3>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      {children}
    </section>
  );
}

export default function ScanPreviewSheet({
  mediaId,
  proposal,
  episodes,
  open,
  onOpenChange,
}: ScanPreviewSheetProps) {
  const { apply } = useScanFolder(mediaId);
  const [rows, setRows] = useState<Row[]>(() => [
    ...proposal.auto.map((match) => toRow(match, true)),
    ...proposal.needsConfirmation.map((match) => toRow(match, false)),
  ]);

  const autoRows = rows.filter((row) => row.auto);
  const confirmRows = rows.filter((row) => !row.auto);
  const includedRows = rows.filter((row) => row.included);
  const conflictRows = rows.filter((row) => row.conflict);

  const seenTargets = new Set<string>();
  let hasDuplicateTarget = false;
  for (const row of includedRows) {
    if (seenTargets.has(row.episodeId)) {
      hasDuplicateTarget = true;
    }
    seenTargets.add(row.episodeId);
  }

  const applyError = errorText(apply.error);
  const canApply = includedRows.length > 0 && !hasDuplicateTarget;

  function updateRow(path: string, patch: Partial<Row>) {
    setRows((current) =>
      current.map((row) => (row.path === path ? { ...row, ...patch } : row)),
    );
  }

  async function handleApply() {
    if (!canApply) return;
    try {
      await apply.mutateAsync(
        includedRows.map((row) => ({
          episodeId: row.episodeId,
          path: row.path,
        })),
      );
      onOpenChange(false);
    } catch {
      // The error is surfaced through apply.error.
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Scan results</SheetTitle>
          <SheetDescription className="break-all">
            {proposal.folder}
          </SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-4">
          {conflictRows.length > 0 && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" />
              <p>
                {conflictRows.length} files match an episode that another file
                also matches. Pick one per episode before linking.
              </p>
            </div>
          )}

          {autoRows.length > 0 && (
            <ListSection
              title={`Matched (${autoRows.length})`}
              description="High-confidence matches. These are linked when you confirm."
            >
              <ul className="space-y-2">
                {autoRows.map((row) => (
                  <MatchRow
                    key={row.path}
                    row={row}
                    episodes={episodes}
                    onToggle={(included) => updateRow(row.path, { included })}
                    onChangeEpisode={(episodeId) =>
                      updateRow(row.path, { episodeId })
                    }
                  />
                ))}
              </ul>
            </ListSection>
          )}

          {confirmRows.length > 0 && (
            <ListSection
              title={`Needs confirmation (${confirmRows.length})`}
              description="Low-confidence matches. Tick the ones you want to link."
            >
              <ul className="space-y-2">
                {confirmRows.map((row) => (
                  <MatchRow
                    key={row.path}
                    row={row}
                    episodes={episodes}
                    onToggle={(included) => updateRow(row.path, { included })}
                    onChangeEpisode={(episodeId) =>
                      updateRow(row.path, { episodeId })
                    }
                  />
                ))}
              </ul>
            </ListSection>
          )}

          {rows.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No video files were matched to this series.
            </p>
          )}

          {proposal.unmatched.length > 0 && (
            <ListSection title={`Unmatched (${proposal.unmatched.length})`}>
              <ul className="space-y-1 text-xs text-muted-foreground">
                {proposal.unmatched.map((entry) => (
                  <li key={entry.path} className="truncate" title={entry.path}>
                    {entry.fileName}
                    <span className="text-muted-foreground/70">
                      {" - "}
                      {entry.reason}
                    </span>
                  </li>
                ))}
              </ul>
            </ListSection>
          )}

          {proposal.ignored.length > 0 && (
            <ListSection title={`Ignored (${proposal.ignored.length})`}>
              <ul className="space-y-1 text-xs text-muted-foreground">
                {proposal.ignored.map((entry) => (
                  <li key={entry.path} className="truncate" title={entry.path}>
                    {entry.fileName}
                    <span className="text-muted-foreground/70">
                      {" - "}
                      {entry.reason}
                    </span>
                  </li>
                ))}
              </ul>
            </ListSection>
          )}
        </div>

        <SheetFooter>
          {hasDuplicateTarget && (
            <p className="text-xs text-destructive">
              Two selected files point to the same episode. Change or untick
              one.
            </p>
          )}
          {applyError && (
            <p className="text-xs text-destructive">{applyError}</p>
          )}
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={apply.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleApply}
              disabled={!canApply || apply.isPending}
            >
              {apply.isPending ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Link2 />
              )}
              Link {includedRows.length}{" "}
              {includedRows.length === 1 ? "episode" : "episodes"}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
