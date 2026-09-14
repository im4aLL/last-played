import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import PosterCard, { PosterCardSkeleton } from "@/components/app/poster-card";
import { progressRatio, type MediaItem } from "@/lib/types";

type MediaGridProps = {
  items: MediaItem[];
  hasMore?: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => void;
};

const LOAD_MORE_COUNT = 6;

export default function MediaGrid({
  items,
  hasMore = false,
  loadingMore = false,
  onLoadMore,
}: MediaGridProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasMore || !onLoadMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) onLoadMore();
      },
      { rootMargin: "600px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, onLoadMore, items.length]);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))] gap-x-4 gap-y-6 sm:grid-cols-[repeat(auto-fill,minmax(10rem,1fr))]">
        {items.map((item) => (
          <Link key={item.id} to={`/media/${item.id}`} className="group">
            <PosterCard
              title={item.title}
              year={item.year}
              posterUrl={item.posterUrl}
              mediaType={item.type}
              progress={progressRatio(item.progress)}
              watched={item.progress?.watched ?? false}
              className="w-full sm:w-full"
            />
          </Link>
        ))}
        {loadingMore &&
          Array.from({ length: LOAD_MORE_COUNT }, (_, index) => (
            <PosterCardSkeleton key={`loading-${index}`} />
          ))}
      </div>
      {hasMore && (
        <div ref={sentinelRef} className="h-px w-full" aria-hidden="true" />
      )}
    </div>
  );
}
