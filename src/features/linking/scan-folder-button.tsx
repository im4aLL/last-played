import { useMemo, useState } from "react";
import { FolderSearch, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import ScanPreviewSheet, {
  type EpisodeOption,
} from "@/features/linking/scan-preview";
import { useScanFolder } from "@/features/linking/use-scan";
import { pickFolder } from "@/features/linking/video-file";
import type { ScanProposal, Season } from "@/lib/types";

type ScanFolderButtonProps = {
  mediaId: string;
  seasons: Season[];
  size?: "default" | "sm" | "xs" | "lg";
  variant?: "default" | "outline" | "secondary" | "ghost";
};

function toEpisodeOptions(seasons: Season[]): EpisodeOption[] {
  return seasons.flatMap((season) =>
    season.episodes.map((episode) => ({
      id: episode.id,
      label: `S${String(season.seasonNumber).padStart(2, "0")}E${String(
        episode.episodeNumber,
      ).padStart(2, "0")} - ${episode.name}`,
    })),
  );
}

export default function ScanFolderButton({
  mediaId,
  seasons,
  size = "lg",
  variant = "outline",
}: ScanFolderButtonProps) {
  const { scan } = useScanFolder(mediaId);
  const [proposal, setProposal] = useState<ScanProposal | null>(null);
  const [scanId, setScanId] = useState(0);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const episodes = useMemo(() => toEpisodeOptions(seasons), [seasons]);

  async function handleClick() {
    setError(null);
    try {
      const folder = await pickFolder();
      if (!folder) return;
      const result = await scan.mutateAsync(folder);
      setProposal(result);
      setScanId((current) => current + 1);
      setOpen(true);
    } catch (value) {
      setError(value instanceof Error ? value.message : String(value));
    }
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <Button
        type="button"
        size={size}
        variant={variant}
        onClick={handleClick}
        disabled={scan.isPending}
      >
        {scan.isPending ? (
          <Loader2 className="animate-spin" />
        ) : (
          <FolderSearch />
        )}
        Scan folder
      </Button>
      {error && <span className="text-xs text-destructive">{error}</span>}

      {proposal && (
        <ScanPreviewSheet
          key={scanId}
          mediaId={mediaId}
          proposal={proposal}
          episodes={episodes}
          open={open}
          onOpenChange={setOpen}
        />
      )}
    </span>
  );
}
