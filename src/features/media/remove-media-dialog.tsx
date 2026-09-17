import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { errorMessage } from "@/lib/errors";

type RemoveMediaDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  isPending: boolean;
  error: unknown;
  onConfirm: () => void;
};

export default function RemoveMediaDialog({
  open,
  onOpenChange,
  title,
  isPending,
  error,
  onConfirm,
}: RemoveMediaDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={!isPending}>
        <DialogHeader>
          <DialogTitle>Remove from library?</DialogTitle>
          <DialogDescription>
            {title} will be removed from your library along with its linked
            files and watch history. This cannot be undone.
          </DialogDescription>
        </DialogHeader>

        {error != null && (
          <p className="text-sm text-destructive">{errorMessage(error)}</p>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={isPending}
            onClick={onConfirm}
          >
            {isPending ? "Removing..." : "Remove"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
