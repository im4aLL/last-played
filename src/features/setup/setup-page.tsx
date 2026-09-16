import { Check, Clapperboard, Cloud, HardDrive } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "cn";
import SettingField from "@/components/app/setting-field";
import OfflineNotice from "@/components/app/offline-notice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppConfig, type DbMode } from "@/lib/app-config";
import { selectOnline, useConnection } from "@/lib/connection";
import { errorMessage } from "@/lib/errors";

const MODE_OPTIONS: {
  mode: DbMode;
  title: string;
  description: string;
  icon: typeof HardDrive;
}[] = [
  {
    mode: "local",
    title: "Local only",
    description:
      "Store the library on this device. Nothing leaves your machine.",
    icon: HardDrive,
  },
  {
    mode: "remote",
    title: "Local + Remote sync",
    description:
      "Keep a local copy and sync watch progress across devices with Turso.",
    icon: Cloud,
  },
];

function ModeOption({
  mode,
  title,
  description,
  icon: Icon,
  selected,
  onSelect,
}: (typeof MODE_OPTIONS)[number] & {
  selected: boolean;
  onSelect: (mode: DbMode) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(mode)}
      aria-pressed={selected}
      className={cn(
        "flex flex-col gap-2 rounded-xl border p-4 text-left transition-colors",
        selected
          ? "border-primary bg-primary/5 ring-2 ring-primary/30"
          : "border-border hover:bg-muted",
      )}
    >
      <span className="flex items-center gap-2">
        <Icon className="size-5" />
        <span className="font-medium">{title}</span>
        {selected && <Check className="ml-auto size-4 text-primary" />}
      </span>
      <span className="text-xs text-muted-foreground">{description}</span>
    </button>
  );
}

export default function SetupPage() {
  const navigate = useNavigate();
  const setDbMode = useAppConfig((state) => state.setDbMode);
  const tursoUrl = useAppConfig((state) => state.tursoUrl);
  const tursoAuthToken = useAppConfig((state) => state.tursoAuthToken);
  const setTursoUrl = useAppConfig((state) => state.setTursoUrl);
  const setTursoAuthToken = useAppConfig((state) => state.setTursoAuthToken);
  const [mode, setMode] = useState<DbMode>("local");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const online = useConnection(selectOnline);

  const handleContinue = async () => {
    if (mode === "remote" && !online) return;
    setSubmitting(true);
    setError(null);
    try {
      await setDbMode(
        mode,
        mode === "remote" ? { tursoUrl, tursoAuthToken } : undefined,
      );
      navigate("/");
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/30 p-6">
      <div className="w-full max-w-2xl space-y-8">
        <header className="space-y-3 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Clapperboard className="size-6" />
          </div>
          <div className="space-y-1">
            <p className="font-heading text-sm font-semibold">Last Played</p>
            <h1 className="font-heading text-2xl font-semibold tracking-tight">
              Where should your library live?
            </h1>
            <p className="text-sm text-muted-foreground">
              Choose how Last Played stores your library. You can change this
              later in Settings.
            </p>
          </div>
        </header>

        <div className="grid gap-4 sm:grid-cols-2">
          {MODE_OPTIONS.map((option) => (
            <ModeOption
              key={option.mode}
              {...option}
              selected={mode === option.mode}
              onSelect={setMode}
            />
          ))}
        </div>

        {mode === "remote" && (
          <div className="grid gap-4 rounded-xl border bg-card p-4">
            <SettingField
              id="setup-turso-url"
              label="Turso URL"
              description="The libSQL URL of your remote database."
            >
              <Input
                id="setup-turso-url"
                value={tursoUrl}
                onChange={(event) => setTursoUrl(event.target.value)}
                placeholder="libsql://your-database.turso.io"
                autoComplete="off"
              />
            </SettingField>

            <SettingField
              id="setup-turso-token"
              label="Auth token"
              description="A token with read and write access to the database."
            >
              <Input
                id="setup-turso-token"
                type="password"
                value={tursoAuthToken}
                onChange={(event) => setTursoAuthToken(event.target.value)}
                placeholder="Paste your Turso auth token"
                autoComplete="off"
              />
            </SettingField>
          </div>
        )}

        {mode === "remote" && !online && (
          <OfflineNotice message="No internet connection" />
        )}

        {error && (
          <p
            role="alert"
            className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {error}
          </p>
        )}

        <div className="flex justify-end">
          <Button
            onClick={handleContinue}
            disabled={submitting || (mode === "remote" && !online)}
          >
            {submitting ? "Setting up..." : "Continue"}
          </Button>
        </div>
      </div>
    </div>
  );
}
