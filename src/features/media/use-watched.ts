import { useMutation, useQueryClient } from "@tanstack/react-query";
import { setWatched } from "@/lib/api";

export function useSetWatched() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      mediaId,
      episodeId,
      watched,
    }: {
      mediaId: string;
      episodeId?: string;
      watched: boolean;
    }) => setWatched(mediaId, episodeId, watched),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["media"] });
    },
  });
}
