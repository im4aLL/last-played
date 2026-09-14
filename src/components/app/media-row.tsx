import {
  ChevronLeft,
  ChevronRight,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import EmptyState from "@/components/app/empty-state";
import PosterCard, { PosterCardSkeleton } from "@/components/app/poster-card";
import { Button } from "@/components/ui/button";
import { progressRatio, type MediaItem } from "@/lib/types";

export type MediaRowStatus = "loading" | "error" | "ready";

type MediaRowProps = {
  title: string;
  items: MediaItem[];
  status?: MediaRowStatus;
  errorMessage?: string;
  emptyMessage?: string;
  emptyIcon?: LucideIcon;
  onRetry?: () => void;
};

const SKELETON_COUNT = 6;

export default function MediaRow({
  title,
  items,
  status = "ready",
  errorMessage,
  emptyMessage,
  emptyIcon,
  onRetry,
}: MediaRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(true);

  const updateScrollState = useCallback(() => {
    const element = scrollRef.current;
    if (!element) return;
    setAtStart(element.scrollLeft <= 1);
    setAtEnd(
      element.scrollLeft + element.clientWidth >= element.scrollWidth - 1,
    );
  }, []);

  useEffect(() => {
    updateScrollState();
    window.addEventListener("resize", updateScrollState);
    return () => window.removeEventListener("resize", updateScrollState);
  }, [updateScrollState, items.length, status]);

  const scrollByPage = (direction: -1 | 1) => {
    const element = scrollRef.current;
    if (!element) return;
    element.scrollBy({
      left: direction * element.clientWidth * 0.9,
      behavior: "smooth",
    });
  };

  const isLoading = status === "loading";
  const isError = status === "error";
  const hasItems = !isLoading && !isError && items.length > 0;
  const isEmpty = !isLoading && !isError && items.length === 0;

  return (
    <section className="flex flex-col">
      <div className="flex items-center justify-between gap-4">
        <h2 className="font-heading text-lg font-semibold tracking-tight">
          {title}
        </h2>
        {hasItems && (
          <div className="hidden gap-1 sm:flex">
            <Button
              variant="ghost"
              size="icon-sm"
              disabled={atStart}
              onClick={() => scrollByPage(-1)}
              aria-label={`Scroll ${title} left`}
            >
              <ChevronLeft />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              disabled={atEnd}
              onClick={() => scrollByPage(1)}
              aria-label={`Scroll ${title} right`}
            >
              <ChevronRight />
            </Button>
          </div>
        )}
      </div>

      <div className="mt-3">
        {isLoading && (
          <div className="flex gap-4 overflow-hidden">
            {Array.from({ length: SKELETON_COUNT }, (_, index) => (
              <PosterCardSkeleton key={index} />
            ))}
          </div>
        )}

        {isError && (
          <EmptyState
            icon={TriangleAlert}
            title="Something went wrong"
            description={errorMessage ?? "This row could not be loaded."}
            action={
              onRetry && (
                <Button variant="outline" size="sm" onClick={onRetry}>
                  Try again
                </Button>
              )
            }
          />
        )}

        {isEmpty && (
          <EmptyState
            icon={emptyIcon}
            title={emptyMessage ?? "Nothing here yet"}
          />
        )}

        {hasItems && (
          <div
            ref={scrollRef}
            onScroll={updateScrollState}
            className="flex snap-x gap-4 overflow-x-auto pb-2 scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {items.map((item) => (
              <Link
                key={item.id}
                to={`/media/${item.id}`}
                className="snap-start"
              >
                <PosterCard
                  title={item.title}
                  year={item.year}
                  posterUrl={item.posterUrl}
                  mediaType={item.type}
                  progress={progressRatio(item.progress)}
                  watched={item.progress?.watched ?? false}
                />
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
