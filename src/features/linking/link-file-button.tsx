import { useState } from "react";
import { Link2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLinkFile } from "@/features/linking/use-link-file";
import { pickVideoFile } from "@/features/linking/video-file";

type LinkFileButtonProps = {
  mediaId: string;
  episodeId?: string;
  size?: "default" | "sm" | "xs" | "lg";
  variant?: "default" | "outline" | "secondary" | "ghost";
};

export default function LinkFileButton({
  mediaId,
  episodeId,
  size = "sm",
  variant = "outline",
}: LinkFileButtonProps) {
  const { linkMovie, linkEpisode } = useLinkFile(mediaId);
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pending = picking || linkMovie.isPending || linkEpisode.isPending;

  async function handleClick() {
    setError(null);
    setPicking(true);
    try {
      const path = await pickVideoFile();
      if (!path) return;
      if (episodeId) {
        await linkEpisode.mutateAsync({ episodeId, path });
      } else {
        await linkMovie.mutateAsync(path);
      }
    } catch (value) {
      setError(value instanceof Error ? value.message : String(value));
    } finally {
      setPicking(false);
    }
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <Button
        type="button"
        size={size}
        variant={variant}
        onClick={handleClick}
        disabled={pending}
      >
        {pending ? <Loader2 className="animate-spin" /> : <Link2 />}
        Link file
      </Button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </span>
  );
}
