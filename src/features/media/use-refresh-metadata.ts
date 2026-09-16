import { useMutation, useQueryClient } from "@tanstack/react-query";
import { refreshMetadata } from "@/lib/api";
import { selectOnline, useConnection } from "@/lib/connection";

export function useRefreshMetadata() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (mediaId: string) => {
      if (!selectOnline(useConnection.getState())) {
        throw new Error("No internet connection");
      }
      return refreshMetadata(mediaId);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["media"] });
    },
  });
}
