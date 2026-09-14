import { FileVideo, Loader2, TriangleAlert, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLinkFile } from "@/features/linking/use-link-file";
import { cn } from "cn";
import type { VideoFile } from "@/lib/types";

type LinkedFileProps = {
  mediaId: string;
  file: VideoFile;
  className?: string;
};

export default function LinkedFile({
  mediaId,
  file,
  className,
}: LinkedFileProps) {
  const { unlink } = useLinkFile(mediaId);

  return (
    <span
      className={cn(
        "inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground",
        file.missing && "bg-destructive/10 text-destructive",
        className,
      )}
      title={file.missing ? `${file.path} (missing)` : file.path}
    >
      {file.missing ? (
        <TriangleAlert className="size-3.5 shrink-0" />
      ) : (
        <FileVideo className="size-3.5 shrink-0" />
      )}
      <span className="truncate">
        {file.fileName}
        {file.missing && " - file missing"}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        onClick={() => unlink.mutate(file.id)}
        disabled={unlink.isPending}
        aria-label="Unlink file"
        title="Unlink file"
      >
        {unlink.isPending ? <Loader2 className="animate-spin" /> : <X />}
      </Button>
    </span>
  );
}
