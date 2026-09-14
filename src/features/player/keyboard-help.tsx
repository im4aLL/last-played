import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { KEYBINDING_GROUPS } from "@/features/player/keybindings";

export default function KeyboardHelp({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85svh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription>
            Playback controls for the player. Close with Esc or ?.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 sm:grid-cols-2">
          {KEYBINDING_GROUPS.map((group) => (
            <section key={group.title} className="space-y-2">
              <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {group.title}
              </h3>
              <ul className="space-y-1.5">
                {group.bindings.map((binding) => (
                  <li
                    key={binding.label}
                    className="flex items-center justify-between gap-4 text-sm"
                  >
                    <span className="text-muted-foreground">
                      {binding.label}
                    </span>
                    <span className="flex shrink-0 items-center gap-1">
                      {binding.keys.map((key, index) => (
                        <span
                          key={`${binding.label}-${key}-${index}`}
                          className="flex items-center gap-1"
                        >
                          {index > 0 && (
                            <span className="text-xs text-muted-foreground">
                              /
                            </span>
                          )}
                          <kbd className="rounded-md border bg-muted px-1.5 py-0.5 font-mono text-xs font-medium">
                            {key}
                          </kbd>
                        </span>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
