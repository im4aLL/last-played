import { WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";

type OfflineNoticeProps = {
  message?: string;
  onTryAnyway?: () => void;
};

export default function OfflineNotice({
  message = "No internet connection",
  onTryAnyway,
}: OfflineNoticeProps) {
  return (
    <div
      role="status"
      className="flex items-center gap-2 rounded-lg border border-border bg-muted px-3 py-2 text-sm text-muted-foreground"
    >
      <WifiOff className="size-4 shrink-0" />
      <span>{message}</span>
      {onTryAnyway && (
        <Button
          type="button"
          variant="link"
          size="sm"
          onClick={onTryAnyway}
          className="ml-auto"
        >
          Try anyway
        </Button>
      )}
    </div>
  );
}
