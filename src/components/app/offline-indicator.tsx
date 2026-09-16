import { WifiOff } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { selectOnline, useConnection } from "@/lib/connection";

export default function OfflineIndicator() {
  const online = useConnection(selectOnline);

  if (online) {
    return null;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          role="img"
          aria-label="Offline: no internet connection"
          tabIndex={0}
          className="inline-flex h-8 items-center gap-2 px-2 text-xs text-muted-foreground"
        >
          <WifiOff className="size-3.5" />
          <span className="hidden md:inline">Offline</span>
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <p>No internet connection. Local library and playback still work.</p>
      </TooltipContent>
    </Tooltip>
  );
}
