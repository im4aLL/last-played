import { Cloud, CloudOff, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAppConfig } from "@/lib/app-config";
import { useSyncNow, useSyncStatus } from "./use-sync";

function formatRelative(timestamp: number): string {
  const diff = Date.now() - timestamp;
  if (diff < 60_000) return "just now";
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function SyncIndicator() {
  const dbMode = useAppConfig((state) => state.dbMode);
  const status = useSyncStatus();
  const syncNow = useSyncNow();

  if (dbMode !== "remote") {
    return null;
  }

  const syncing = syncNow.isPending || status.data?.state === "syncing";
  const error = status.data?.error ?? null;
  const pending = status.data?.pending ?? false;
  const lastSyncedAt = status.data?.lastSyncedAt ?? null;

  let label = "Sync";
  let icon = <Cloud className="size-3.5" />;
  if (syncing) {
    label = "Syncing";
    icon = <Loader2 className="size-3.5 animate-spin" />;
  } else if (error) {
    label = "Sync error";
    icon = <CloudOff className="size-3.5" />;
  } else if (pending) {
    label = "Pending";
    icon = <RefreshCw className="size-3.5" />;
  } else if (lastSyncedAt) {
    label = `Synced ${formatRelative(lastSyncedAt)}`;
  }

  const detail = error
    ? error
    : lastSyncedAt
      ? `Last synced ${new Date(lastSyncedAt).toLocaleString()}`
      : "Not synced yet";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 gap-2 text-xs text-muted-foreground"
          onClick={() => syncNow.mutate()}
          disabled={syncing}
          aria-label={`${label}. Sync now`}
        >
          {icon}
          <span className="hidden md:inline">{label}</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{detail}</p>
        <p className="text-muted-foreground">Click to sync now</p>
      </TooltipContent>
    </Tooltip>
  );
}
