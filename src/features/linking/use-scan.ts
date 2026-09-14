import { useMutation, useQueryClient } from "@tanstack/react-query";
import { applyScanMatches, scanSeriesFolder } from "@/lib/api";
import type { ScanMatchInput } from "@/lib/types";

export function useScanFolder(mediaId: string) {
  const queryClient = useQueryClient();

  const scan = useMutation({
    mutationFn: (folder: string) => scanSeriesFolder(mediaId, folder),
  });

  const apply = useMutation({
    mutationFn: (matches: ScanMatchInput[]) =>
      applyScanMatches(mediaId, matches),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["media"] }),
  });

  return { scan, apply };
}
