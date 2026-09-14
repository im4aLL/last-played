import { Database, KeyRound, MonitorPlay, UserRound } from "lucide-react";
import type { ReactNode } from "react";
import SettingField from "@/components/app/setting-field";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { LANGUAGE_OPTIONS, useAppConfig, type DbMode } from "@/lib/app-config";

function SectionCard({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: typeof Database;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon className="size-4 text-muted-foreground" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5">{children}</CardContent>
    </Card>
  );
}

function SliderSetting({
  id,
  label,
  description,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
  id: string;
  label: string;
  description: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (value: number) => string;
  onChange: (value: number) => void;
}) {
  return (
    <SettingField id={id} label={label} description={description}>
      <div className="flex items-center gap-4">
        <Slider
          id={id}
          value={[value]}
          min={min}
          max={max}
          step={step}
          onValueChange={([next]) => onChange(next)}
          className="flex-1"
        />
        <span className="w-12 text-right text-sm tabular-nums text-muted-foreground">
          {format(value)}
        </span>
      </div>
    </SettingField>
  );
}

export default function SettingsPage() {
  const dbMode = useAppConfig((state) => state.dbMode);
  const setDbMode = useAppConfig((state) => state.setDbMode);
  const tmdbApiKey = useAppConfig((state) => state.tmdbApiKey);
  const setTmdbApiKey = useAppConfig((state) => state.setTmdbApiKey);
  const deviceName = useAppConfig((state) => state.deviceName);
  const setDeviceName = useAppConfig((state) => state.setDeviceName);
  const tursoUrl = useAppConfig((state) => state.tursoUrl);
  const setTursoUrl = useAppConfig((state) => state.setTursoUrl);
  const tursoAuthToken = useAppConfig((state) => state.tursoAuthToken);
  const setTursoAuthToken = useAppConfig((state) => state.setTursoAuthToken);
  const player = useAppConfig((state) => state.player);
  const setPlayerPreferences = useAppConfig(
    (state) => state.setPlayerPreferences,
  );

  const mode = dbMode ?? "local";
  const isRemote = mode === "remote";

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 p-6 md:p-8">
      <header className="space-y-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Settings
        </h1>
        <p className="text-sm text-muted-foreground">
          Database, metadata, device, and playback preferences.
        </p>
      </header>

      <SectionCard
        icon={Database}
        title="Database"
        description="Choose where your library lives. Local keeps everything on this device."
      >
        <SettingField
          id="db-mode"
          label="Mode"
          description="Remote mode adds Turso sync on top of the local copy."
        >
          <Select
            value={mode}
            onValueChange={(value) => setDbMode(value as DbMode)}
          >
            <SelectTrigger id="db-mode" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="local">Local only</SelectItem>
              <SelectItem value="remote">Local + Remote sync</SelectItem>
            </SelectContent>
          </Select>
        </SettingField>

        {isRemote ? (
          <>
            <SettingField
              id="settings-turso-url"
              label="Turso URL"
              description="The libSQL URL of your remote database."
            >
              <Input
                id="settings-turso-url"
                value={tursoUrl}
                onChange={(event) => setTursoUrl(event.target.value)}
                placeholder="libsql://your-database.turso.io"
                autoComplete="off"
              />
            </SettingField>

            <SettingField
              id="settings-turso-token"
              label="Auth token"
              description="A token with read and write access to the database."
            >
              <Input
                id="settings-turso-token"
                type="password"
                value={tursoAuthToken}
                onChange={(event) => setTursoAuthToken(event.target.value)}
                placeholder="Paste your Turso auth token"
                autoComplete="off"
              />
            </SettingField>
          </>
        ) : (
          <p className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
            Local mode stores your library only on this device. No Turso URL or
            token is needed.
          </p>
        )}
      </SectionCard>

      <SectionCard
        icon={KeyRound}
        title="Metadata"
        description="TMDB provides posters, overviews, and episode metadata."
      >
        <SettingField
          id="tmdb-api-key"
          label="TMDB API key"
          description="Kept on this device and used only for metadata lookups."
        >
          <Input
            id="tmdb-api-key"
            type="password"
            value={tmdbApiKey}
            onChange={(event) => setTmdbApiKey(event.target.value)}
            placeholder="Enter your TMDB API key"
            autoComplete="off"
          />
        </SettingField>
        <p className="text-xs text-muted-foreground">
          This product uses the TMDB API but is not endorsed or certified by
          TMDB.
        </p>
      </SectionCard>

      <SectionCard
        icon={UserRound}
        title="Device"
        description="Names this machine in the library and sync status."
      >
        <SettingField
          id="device-name"
          label="Device name"
          description="Shown next to files that are linked on this machine."
        >
          <Input
            id="device-name"
            value={deviceName}
            onChange={(event) => setDeviceName(event.target.value)}
            placeholder="e.g. Living room Mac mini"
          />
        </SettingField>
      </SectionCard>

      <SectionCard
        icon={MonitorPlay}
        title="Player preferences"
        description="Defaults applied when playback starts."
      >
        <SliderSetting
          id="watched-threshold"
          label="Watched threshold"
          description="Mark an item watched once you pass this percentage."
          value={player.watchedThreshold}
          min={50}
          max={100}
          step={5}
          format={(value) => `${value}%`}
          onChange={(watchedThreshold) =>
            setPlayerPreferences({ watchedThreshold })
          }
        />

        <SettingField
          id="subtitle-language"
          label="Preferred subtitle language"
          description="Used when a file offers multiple subtitle tracks."
        >
          <Select
            value={player.subtitleLanguage}
            onValueChange={(subtitleLanguage) =>
              setPlayerPreferences({ subtitleLanguage })
            }
          >
            <SelectTrigger id="subtitle-language" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGE_OPTIONS.map((language) => (
                <SelectItem key={language.value} value={language.value}>
                  {language.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SettingField>

        <SettingField
          id="audio-language"
          label="Preferred audio language"
          description="Used when a file offers multiple audio tracks."
        >
          <Select
            value={player.audioLanguage}
            onValueChange={(audioLanguage) =>
              setPlayerPreferences({ audioLanguage })
            }
          >
            <SelectTrigger id="audio-language" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGE_OPTIONS.map((language) => (
                <SelectItem key={language.value} value={language.value}>
                  {language.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SettingField>

        <SliderSetting
          id="default-volume"
          label="Default volume"
          description="Volume applied at the start of playback."
          value={player.volume}
          min={0}
          max={100}
          step={5}
          format={(value) => `${value}%`}
          onChange={(volume) => setPlayerPreferences({ volume })}
        />
      </SectionCard>
    </div>
  );
}
