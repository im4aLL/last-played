import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteMedia } from "@/lib/api";

export function useRemoveMedia() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (mediaId: string) => deleteMedia(mediaId),
    onSuccess: (_data, mediaId) => {
      queryClient.removeQueries({ queryKey: ["media", "detail", mediaId] });
      void queryClient.invalidateQueries({ queryKey: ["media"] });
    },
  });
}
