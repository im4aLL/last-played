import { Film, Tv, type LucideIcon } from "lucide-react";
import { useState, type ReactNode } from "react";
import { cn } from "cn";
import { selectOnline, useConnection } from "@/lib/connection";
import { posterHue } from "@/lib/poster";
import type { MediaType } from "@/lib/types";

type PosterArtProps = {
  title: string;
  posterUrl?: string | null;
  mediaType?: MediaType;
  className?: string;
  children?: ReactNode;
};

const MEDIA_ICONS: Record<MediaType, LucideIcon> = {
  movie: Film,
  tv: Tv,
};

export default function PosterArt({
  title,
  posterUrl,
  mediaType = "movie",
  className,
  children,
}: PosterArtProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const online = useConnection(selectOnline);
  const Icon = MEDIA_ICONS[mediaType];
  const hue = posterHue(title);
  const showImage = Boolean(posterUrl) && !imageFailed && online;

  return (
    <div
      className={cn(
        "relative aspect-[2/3] overflow-hidden rounded-lg bg-muted",
        className,
      )}
    >
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

      {children}
    </div>
  );
}
