import { Check, Film, Tv, type LucideIcon } from "lucide-react";
import { useState } from "react";
import { cn } from "cn";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
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

const MEDIA_ICONS: Record<MediaType, LucideIcon> = {
  movie: Film,
  tv: Tv,
};

function posterHue(seed: string) {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) | 0;
  }
  return Math.abs(hash) % 360;
}

export default function PosterCard({
  title,
  year,
  posterUrl,
  mediaType = "movie",
  progress,
  watched = false,
  className,
}: PosterCardProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const Icon = MEDIA_ICONS[mediaType];
  const hue = posterHue(title);
  const showImage = Boolean(posterUrl) && !imageFailed;
  const showProgress = !watched && progress != null && progress > 0;

  return (
    <div className={cn("group w-36 shrink-0 sm:w-40", className)}>
      <div className="relative aspect-[2/3] overflow-hidden rounded-lg bg-muted ring-1 ring-foreground/10 transition group-hover:ring-2 group-hover:ring-foreground/30">
        {showImage ? (
          <img
            src={posterUrl ?? undefined}
            alt={title}
            loading="lazy"
            onError={() => setImageFailed(true)}
            className="size-full object-cover"
          />
        ) : (
          <div
            className="flex size-full flex-col items-center justify-center gap-2 px-3 text-center text-white"
            style={{
              backgroundImage: `linear-gradient(140deg, hsl(${hue} 45% 38%), hsl(${(hue + 48) % 360} 55% 18%))`,
            }}
          >
            <Icon className="size-6 opacity-80" />
            <span className="text-xs leading-tight font-medium opacity-90">
              {title}
            </span>
          </div>
        )}

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
      </div>

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
