import { TriangleAlert, Tv } from "lucide-react";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import EmptyState from "@/components/app/empty-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import MediaHero from "@/features/media/media-hero";
import RemoveMediaDialog from "@/features/media/remove-media-dialog";
import SeasonSection from "@/features/media/season-section";
import { useMedia } from "@/features/media/use-media";
import { useRemoveMedia } from "@/features/media/use-remove-media";

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
  const navigate = useNavigate();
  const { status, detail, error, reload } = useMedia(id ?? "");
  const [removeOpen, setRemoveOpen] = useState(false);
  const removeMedia = useRemoveMedia();

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
      <MediaHero detail={detail} onRemove={() => setRemoveOpen(true)} />

      {detail.type === "tv" && detail.seasons.length > 0 && (
        <div className="mt-8 px-6 md:px-8">
          <SeasonSection
            key={detail.id}
            mediaId={detail.id}
            seasons={detail.seasons}
            resumeEpisodeId={detail.resume?.episodeId ?? null}
          />
        </div>
      )}

      {detail.type === "tv" && detail.seasons.length === 0 && (
        <div className="mt-8 px-6 md:px-8">
          <EmptyState
            icon={Tv}
            title="No seasons available"
            description="TMDB did not return any seasons for this show."
          />
        </div>
      )}

      <RemoveMediaDialog
        open={removeOpen}
        onOpenChange={(open) => {
          if (!removeMedia.isPending) {
            setRemoveOpen(open);
            if (!open) {
              removeMedia.reset();
            }
          }
        }}
        title={detail.title}
        isPending={removeMedia.isPending}
        error={removeMedia.isError ? removeMedia.error : null}
        onConfirm={() => {
          removeMedia.mutate(detail.id, {
            onSuccess: () => {
              setRemoveOpen(false);
              void navigate("/", { replace: true });
            },
          });
        }}
      />
    </div>
  );
}
