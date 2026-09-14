import { Check } from "lucide-react";
import PosterArt from "@/components/app/poster-art";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "cn";
import type { MediaType } from "@/lib/types";

type PosterCardProps = {
  title: string;
  year?: number | null;
  posterUrl?: string | null;
  mediaType?: MediaType;
  progress?: number | null;
  watched?: boolean;
  className?: string;
};

export default function PosterCard({
  title,
  year,
  posterUrl,
  mediaType = "movie",
  progress,
  watched = false,
  className,
}: PosterCardProps) {
  const showProgress = !watched && progress != null && progress > 0;

  return (
    <div className={cn("group w-36 shrink-0 sm:w-40", className)}>
      <PosterArt
        title={title}
        posterUrl={posterUrl}
        mediaType={mediaType}
        className="ring-1 ring-foreground/10 transition group-hover:ring-2 group-hover:ring-foreground/30"
      >
        {watched && (
          <span
            className="absolute top-2 right-2 flex size-6 items-center justify-center rounded-full bg-background/85 text-foreground shadow-sm"
            title="Watched"
          >
            <Check className="size-3.5" />
          </span>
        )}

        {showProgress && (
          <Progress
            value={progress * 100}
            className="absolute inset-x-0 bottom-0 h-1 rounded-none bg-black/50 [&>div]:bg-white"
          />
        )}
      </PosterArt>

      <div className="mt-2 space-y-0.5">
        <p className="truncate text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{year ?? ""}</p>
      </div>
    </div>
  );
}

export function PosterCardSkeleton() {
  return (
    <div className="w-36 shrink-0 sm:w-40">
      <Skeleton className="aspect-[2/3] w-full rounded-lg" />
      <Skeleton className="mt-2 h-4 w-3/4" />
      <Skeleton className="mt-1 h-3 w-1/3" />
    </div>
  );
}
