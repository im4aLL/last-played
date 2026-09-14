import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getSyncStatus, syncNow } from "@/lib/api";
import { useAppConfig } from "@/lib/app-config";

const REFETCH_INTERVAL_MS = 15_000;

export function useSyncStatus() {
  const dbMode = useAppConfig((state) => state.dbMode);

  return useQuery({
    queryKey: ["sync-status"],
    queryFn: getSyncStatus,
    enabled: dbMode === "remote",
    refetchInterval: REFETCH_INTERVAL_MS,
  });
}

export function useSyncNow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: syncNow,
    onSuccess: (status) => {
      queryClient.setQueryData(["sync-status"], status);
    },
  });
}
