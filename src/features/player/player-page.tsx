import { TriangleAlert } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import EmptyState from "@/components/app/empty-state";
import { Button } from "@/components/ui/button";
import PlayerStage from "@/features/player/player-stage";
import { usePlayer } from "@/features/player/use-player";

function PlayerLoading() {
  return (
    <div className="flex h-svh min-h-0 flex-col items-center justify-center gap-3">
      <div className="size-6 animate-spin rounded-full border-2 border-muted border-t-foreground" />
      <p className="text-sm text-muted-foreground">Preparing playback...</p>
    </div>
  );
}

export default function PlayerPage() {
  const { id } = useParams<{ id: string }>();
  const controller = usePlayer(id ?? "");

  if (controller.status === "loading") {
    return <PlayerLoading />;
  }

  if (controller.status === "error" || !controller.current) {
    return (
      <div className="flex min-h-svh items-center justify-center p-6">
        <EmptyState
          icon={TriangleAlert}
          title="Could not start playback"
          description={
            controller.error?.message ?? "This title is not available."
          }
          action={
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={controller.reload}>
                Try again
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/">Back to library</Link>
              </Button>
            </div>
          }
        />
      </div>
    );
  }

  return <PlayerStage controller={controller} />;
}
