import { useQuery } from "@tanstack/react-query";
import { getMedia } from "@/lib/api";
import { toError } from "@/lib/errors";
import type { MediaDetail } from "@/lib/types";

export type MediaStatus = "loading" | "error" | "ready";

export type MediaState = {
  status: MediaStatus;
  detail: MediaDetail | null;
  error: Error | null;
  reload: () => void;
};

export function useMedia(id: string): MediaState {
  const enabled = id.length > 0;
  const query = useQuery({
    queryKey: ["media", "detail", id],
    queryFn: () => getMedia(id),
    enabled,
  });

  const status: MediaStatus = !enabled
    ? "error"
    : query.isPending
      ? "loading"
      : query.isError
        ? "error"
        : "ready";

  const rawError = enabled
    ? query.error
    : new Error("No media id was provided.");

  return {
    status,
    detail: query.data ?? null,
    error: rawError == null ? null : toError(rawError),
    reload: () => {
      void query.refetch();
    },
  };
}
