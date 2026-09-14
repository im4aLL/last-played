import { TriangleAlert } from "lucide-react";
import { useParams } from "react-router-dom";
import EmptyState from "@/components/app/empty-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import MediaHero from "@/features/media/media-hero";
import SeasonSection from "@/features/media/season-section";
import { useMedia } from "@/features/media/use-media";

function MediaDetailSkeleton() {
  return (
    <div>
      <Skeleton className="h-96 w-full rounded-none md:h-[30rem] lg:h-[34rem]" />
      <div className="px-6 md:px-8">
        <div className="-mt-16 flex flex-col gap-5 sm:flex-row sm:gap-6 md:-mt-24">
          <Skeleton className="aspect-[2/3] w-28 shrink-0 rounded-lg md:w-40" />
          <div className="min-w-0 flex-1 space-y-3 sm:pt-16 md:pt-24">
            <Skeleton className="h-8 w-2/3 max-w-md" />
            <Skeleton className="h-4 w-1/3 max-w-xs" />
            <Skeleton className="h-16 w-full max-w-2xl" />
            <Skeleton className="h-9 w-24" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MediaPage() {
  const { id } = useParams<{ id: string }>();
  const { status, detail, error, reload } = useMedia(id ?? "");

  if (status === "loading") {
    return <MediaDetailSkeleton />;
  }

  if (status === "error" || !detail) {
    return (
      <div className="p-6 md:p-8">
        <EmptyState
          icon={TriangleAlert}
          title="Could not load this title"
          description={error?.message ?? "Please try again."}
          action={
            <Button variant="outline" size="sm" onClick={reload}>
              Try again
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="pb-10">
      <MediaHero detail={detail} />

      {detail.type === "tv" && detail.seasons.length > 0 && (
        <div className="mt-8 px-6 md:px-8">
          <SeasonSection mediaId={detail.id} seasons={detail.seasons} />
        </div>
      )}
    </div>
  );
}
