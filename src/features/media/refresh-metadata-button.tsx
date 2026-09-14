import { RefreshCw } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { useRefreshMetadata } from "@/features/media/use-refresh-metadata";
import { errorMessage } from "@/lib/errors";

type RefreshMetadataButtonProps = {
  mediaId: string;
  size?:
    "default" | "xs" | "sm" | "lg" | "icon" | "icon-xs" | "icon-sm" | "icon-lg";
  variant?: "default" | "outline" | "secondary" | "ghost";
  className?: string;
};

export default function RefreshMetadataButton({
  mediaId,
  size = "icon-sm",
  variant = "ghost",
  className,
}: RefreshMetadataButtonProps) {
  const refresh = useRefreshMetadata();

  return (
    <span className={cn("inline-flex flex-col items-start gap-1", className)}>
      <Button
        type="button"
        size={size}
        variant={variant}
        onClick={() => refresh.mutate(mediaId)}
        disabled={refresh.isPending}
        title="Refresh metadata"
        aria-label="Refresh metadata"
      >
        <RefreshCw className={refresh.isPending ? "animate-spin" : undefined} />
      </Button>
      {refresh.isError && (
        <span className="text-xs text-destructive">
          {errorMessage(refresh.error)}
        </span>
      )}
    </span>
  );
}
