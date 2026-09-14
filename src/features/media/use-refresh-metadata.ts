import { useMutation, useQueryClient } from "@tanstack/react-query";
import { refreshMetadata } from "@/lib/api";

export function useRefreshMetadata() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (mediaId: string) => refreshMetadata(mediaId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["media"] });
    },
  });
}
