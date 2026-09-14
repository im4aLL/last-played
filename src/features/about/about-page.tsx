import { Bug, GitBranch } from "lucide-react";
import { useEffect, useState } from "react";
import { openUrl } from "@tauri-apps/plugin-opener";
import AppLogo from "@/components/app/app-logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  APP_AUTHOR,
  APP_NAME,
  ISSUES_URL,
  REPOSITORY_URL,
  loadAppInfo,
  type AppInfo,
} from "@/lib/app-meta";

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="truncate font-mono text-foreground">
        {value || "Unknown"}
      </span>
    </div>
  );
}

export default function AboutPage() {
  const [info, setInfo] = useState<AppInfo | null>(null);

  useEffect(() => {
    let active = true;
    void loadAppInfo().then((next) => {
      if (active) setInfo(next);
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 p-6 md:p-8">
      <header className="space-y-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          About
        </h1>
        <p className="text-sm text-muted-foreground">
          Version, credits, and where to report problems.
        </p>
      </header>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex aspect-square size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <AppLogo className="size-5" />
            </div>
            <div className="grid gap-1">
              <CardTitle className="flex items-center gap-2">
                {info?.name ?? APP_NAME}
                <Badge variant="secondary">
                  v{info?.version ?? "..."}
                </Badge>
              </CardTitle>
              <CardDescription>
                Track and resume your local movie and TV library.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3">
          <InfoRow label="Version" value={info?.version ?? ""} />
          <InfoRow label="Author" value={APP_AUTHOR} />
          <InfoRow label="Tauri" value={info?.tauriVersion ?? ""} />
          <InfoRow label="Identifier" value={info?.identifier ?? ""} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Project</CardTitle>
          <CardDescription>
            Source code and issue tracking live on GitHub.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => void openUrl(REPOSITORY_URL)}
          >
            <GitBranch />
            Repository
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => void openUrl(ISSUES_URL)}
          >
            <Bug />
            Report an issue
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
