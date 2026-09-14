# Last Played - Implementation Plan

A cross-platform desktop app for building a personal movie and TV library from local video files, with metadata from TMDB, an embedded libVLC player, and cross-device sync of watch progress via a Turso-backed database.

## Problem

Local media collections are large and easy to lose track of. For TV series it is hard to know which episode was watched last, and the files themselves are scattered across folders with inconsistent names. Existing players (VLC) can play anything but do not track a library or watch state in a durable, synced way.

## Goals

- Play any common video container/codec (mp4, mkv, avi, and more) embedded in the app.
- Maintain a library of movies and TV series with metadata (title, overview, poster, seasons, episodes) from TMDB.
- Link local video files to library entries, including intelligent bulk linking of episode folders.
- Track watch progress automatically and resume where you left off.
- Support two database modes: local SQLite only, or local SQLite that syncs to a Turso remote database.
- Share metadata and watch progress across devices while keeping machine-specific file paths from breaking on other machines.
- Provide a Netflix-like dashboard and player experience with keyboard controls.

## Non-goals (for the first version)

- Streaming or downloading media.
- Transcoding or format conversion.
- Remote/network media sources (HTTP URLs) beyond what libVLC natively supports.
- User accounts, multi-user profiles, or sharing a library with other people.
- Mobile clients.
- Automatic filesystem watching / live re-scan on file change (manual scan first).
- Anime absolute-numbering heuristics and specials beyond basic support.

## Locked decisions

- Framework: Tauri v2 with a React + TypeScript frontend.
- Metadata: TMDB, using a user-supplied API key entered in Settings.
- Playback: bundled libVLC (dynamically linked), rendering embedded in the app window via the per-OS native embed API (`set_hwnd` / `set_nsobject` / `set_xwindow`). libVLC is LGPL v2.1+, so dynamic linking keeps the app closed-source.
- Remote database: the `turso` crate with `turso::sync`, syncing a local SQLite-compatible file via explicit `push()` / `pull()`.
- Platforms: macOS, Windows, and Linux. Video file paths are device-scoped.
- Progress: auto-save playback position; mark watched past a configurable threshold (default 90%), plus manual override. Progress is global (one value per movie/episode), so resume position and watched state are the same on every device.
- Subtitles: embedded tracks plus external `.srt`/`.ass` sidecar files.
- Bulk linking: auto-link `S01E01` and `1x01` patterns (multi-episode files link to the first episode), recurse subfolders, ignore non-video files; anything less certain goes to a confirmation list.
- MVP shape: thin end-to-end slice first (pick DB -> add a show -> bulk-link a folder -> play an episode -> resume).

## Architecture overview

```text
+---------------------------------------------------------------+
|  Webview (React + TypeScript + Vite)                          |
|  Library / Media detail / Player controls / Settings          |
|            |  invoke()                                        |
+------------|--------------------------------------------------+
             v
+---------------------------------------------------------------+
|  Tauri Rust core                                              |
|  commands/  -> thin request handlers                          |
|  services/  -> TmdbClient, Scanner, PlayerService, SyncService|
|  db/        -> turso connection, migrations, repositories     |
|  config/    -> local app config + secrets (not synced)        |
+----+---------------------+----------------------+-------------+
     |                     |                      |
     v                     v                      v
  turso SQLite        TMDB REST API           libVLC native
  (local or           (reqwest)               embed in app
   sync <-> Turso)                             window, dynamic
                                               link)
```

## Tech stack

- Shell: Tauri v2.
- Frontend: React + TypeScript + Vite, React Router for screens, TanStack Query for server-state/caching, Zustand for small shared UI state (player status, current device).
- Styling: Tailwind CSS v4 (Vite plugin) with shadcn/ui components. Theme tokens are shadcn CSS variables; no CSS Modules or BEM layer.
- Backend: Rust. `turso` (local SQLite + optional `turso::sync` with Turso), `reqwest` (TMDB), `serde`/`serde_json`, `tokio`, `regex`, `walkdir`, `thiserror`.
- Player: bundled libVLC (shared library, dynamically linked), embedded into the app window with the per-OS native handle (`set_hwnd` / `set_nsobject` / `set_xwindow`) behind `PlayerService`.
- Local secrets/config: Tauri store (JSON in the app config dir); OS keychain as a later hardening step.

The key simplification: use `turso` for both modes. Local mode opens a plain SQLite-compatible file; remote mode opens the same file through `turso::sync` with a remote URL and auth token, then `push()`/`pull()` on demand. One data layer, two configurations.

## Data model

All tables except local-only config live in the synced database.

- `media_item`: one row per movie or show. Columns: `id`, `type` (`movie` | `tv`), `tmdb_id`, `title`, `original_title`, `overview`, `poster_path`, `backdrop_path`, `release_date`, `first_air_date`, `runtime`, `status`, `added_at`, `updated_at`.
- `season`: `id`, `media_item_id`, `season_number`, `name`, `overview`, `poster_path`, `air_date`.
- `episode`: `id`, `season_id`, `media_item_id`, `episode_number`, `name`, `overview`, `still_path`, `air_date`, `runtime`.
- `video_file`: `id`, `media_item_id`, `episode_id` (null for movies), `device_id`, `path`, `size_bytes`, `mtime`, `container`, `added_at`. Unique per (`device_id`, `path`).
- `watch_progress`: `media_item_id`, `episode_id` (null for movies), `position_seconds`, `duration_seconds`, `watched` (bool), `updated_at`. Keyed by media/episode so progress follows you across devices.
- `device`: `id`, `name`, `platform`, `last_seen_at`. Used to label `video_file` rows in the UI.
- `schema_migrations`: `version`, `applied_at`.

Design rules:

- Video paths are device-scoped and never assumed to exist on other machines. A device only reads and writes `video_file` rows where `device_id` matches its own id.
- Watch progress is global (keyed by episode/movie, not device) so resume and watched state travel across machines.
- Metadata is stored locally after fetch so the library works offline and TMDB is only queried on add/refresh.

## Local config and secrets

The whole database syncs, so anything that must stay on one machine or must stay secret lives outside it, in a local app config file.

- `device_id` (generated once per machine), `device_name`.
- `db_mode` (`local` | `remote`), and in remote mode only: `turso_url`, `turso_auth_token`. Local mode requires neither and never prompts for them.
- `tmdb_api_key`.
- Player preferences: watched threshold, preferred subtitle/audio language, volume.

Secrets are not written into the synced DB and are never sent to the webview beyond what the UI needs.

## Rust module structure

```text
src-tauri/src/
  main.rs
  lib.rs                  (app setup, plugin registration, state)
  config/                 (load/save local config + secrets, device identity)
  db/
    mod.rs                (connect local vs sync, push/pull)
    migrations.rs         (versioned embedded SQL migrations)
    repositories/         (media, season, episode, video_file, progress)
  domain/                 (plain structs: MediaItem, Season, Episode, VideoFile, WatchProgress)
  services/
    tmdb/                 (TmdbClient, search, details, season/episode, image URLs)
    scanner/              (folder walk, SxxExx + NxNN parsing, match proposal)
    player/               (libVLC lifecycle, FFI wrapper, per-OS embed, state polling)
    sync/                 (Turso sync trigger + status)
  commands/               (thin #[tauri::command] handlers grouped by area)
```

Command surface (initial):

- Config: `get_config`, `save_config`, `set_db_mode`, `test_db_connection`, `get_device_id`.
- Library: `add_media_from_tmdb`, `list_media`, `get_media`, `delete_media`, `refresh_metadata`.
- Linking: `link_movie_file`, `scan_series_folder`, `apply_scan_matches`, `unlink_video_file`.
- Player: `play_video`, `player_command` (play/pause/seek/volume/track/next), `get_player_state`, `stop_player`.
- Progress: `save_progress`, `get_progress`, `set_watched`, `continue_watching`.
- Sync: `sync_now`, `get_sync_status`.

## Frontend structure

```text
src/
  main.tsx
  App.tsx                 (router + layout shell)
  index.css               (Tailwind import + shadcn theme tokens)
  components/
    ui/                   (shadcn components: Button, Dialog, ...)
    app/                  (Poster, Spinner, EmptyState, ...)
  features/
    setup/                (first-run DB mode selection)
    library/              (grid + rows: Continue Watching, Recently Added, All)
    media/                (movie/show detail, seasons, episodes, watch state)
    linking/              (file picker, folder scan preview + confirm)
    player/               (native video surface mount + dock controls + keybindings)
    settings/             (TMDB key, device name, player prefs; Turso config only in remote mode)
  lib/
    api.ts                (typed wrappers over invoke)
    types.ts              (shared domain types)
    utils.ts              (shadcn cn helper)
  hooks/                  (usePlayer, useProgress, useMedia, ...)
```

## TMDB integration

- The API key is read from local config and used only in Rust (`TmdbClient`) to keep it out of the webview and to allow caching.
- Add flow: user types a name -> search returns ranked results (with year and poster) -> user selects -> fetch full details -> for TV also fetch all seasons and their episodes -> show a confirmation summary -> on confirm, persist `media_item`, `season`, `episode` rows.
- Store `tmdb_id` on every media item so metadata can be refreshed later.
- Images are fetched by URL from TMDB's image CDN; the poster/backdrop path is stored, not the bytes.
- TMDB attribution text is shown in Settings and the About area, per TMDB terms.

## Folder scan and bulk linking

- Input: a folder chosen by the user, plus the target `media_item`.
- Walk recursively with `walkdir`.
- Consider only known video extensions (`mp4`, `mkv`, `avi`, `mov`, `m4v`, `webm`, `wmv`, `flv`, `ts`); ignore everything else (`.txt`, `.nfo`, `.jpg`, samples containing `sample`, etc.).
- Parse `S(\d{1,2})E(\d{1,3})` and `(\d{1,2})x(\d{2,3})`, case-insensitive. These high-confidence matches link automatically. Multi-episode names like `S01E01E02` link to the first episode and are flagged.
- Low-confidence cases require confirmation in the preview and are never auto-linked: files with only a bare number, and files that rely solely on a `season N` / `Season N` folder name for their season.
- Produce a proposal: file path -> matched `season_number`/`episode_number` -> `episode_id`, split into auto-linked, needs-confirmation, and unmatched, with conflicts called out.
- UI shows the preview (matched, unmatched, conflicts); the user confirms or edits before anything is written.
- `apply_scan_matches` writes `video_file` rows for the current `device_id`, replacing existing links for the same episodes on this device.

## Player design

Engine: libVLC, bundled as a dynamically linked shared library per platform (LGPL v2.1+, so dynamic linking keeps the app closed-source). VLC renders into its own native surface, and its docs explicitly recommend embedding over pixel callbacks for performance.

Primary approach (embedded native surface):

- Ship the libVLC shared libraries plus the VLC plugins directory with the app; set the plugin search path at runtime (`VLC_PLUGIN_PATH`) per platform.
- Embed the video surface into the Tauri window with the per-OS handle: Windows `libvlc_media_player_set_hwnd`, macOS `libvlc_media_player_set_nsobject` (NSView), Linux `libvlc_media_player_set_xwindow` (X11; XWayland under Wayland).
- Talk to libVLC through a thin Rust FFI wrapper behind `PlayerService`: `play`/`pause`/`set_time`/`set_position`/`set_volume`, audio/subtitle track selection, and event callbacks (`time_changed`, `length_changed`, `end_reached`, `playing`, `paused`). No out-of-process IPC is needed in the primary path.
- Poll or read cached state a few times per second while playing and persist progress on a debounce plus on pause/stop/close.

Compositing constraint: the native video surface is composited above the webview, so HTML controls cannot reliably render on top of the video. Because this app is keyboard-first, use a reserved-height control dock below the video surface rather than a true overlay. Native fullscreen. If full overlays are needed later, add hole-punching (Windows `SetWindowRgn`) or a separate control surface as a contained enhancement.

Fallback (kept behind the `PlayerService` boundary): if native embedding proves unreliable on a platform, render in a dedicated borderless native video window that is positioned over the app and controlled through the same `PlayerService` API. The rest of the app does not change.

Keyboard bindings (Netflix-like):

- Space or K: play/pause.
- Left/Right: seek -10s / +10s. J/L: seek -10s / +10s.
- Up/Down: volume up/down. M: mute.
- F: toggle fullscreen. Esc: exit fullscreen or close player.
- N / B: next / previous episode. Shift+N / Shift+B: next / previous season.
- S: cycle subtitle track. A: cycle audio track. C: toggle subtitles.
- [ / ]: decrease / increase playback speed.
- Click on the video toggles play/pause; the dock controls hide after inactivity.

## Cross-device and sync model

- Local mode: plain SQLite-compatible file in the app data dir, opened with `turso::Builder::new_local()`.
- Remote mode: the same file opened through `turso::sync` with the stored URL and token. All reads and writes stay local; `push()`/`pull()` exchange changes on app start, on a timer, and after meaningful writes (add media, progress updates, link changes).
- Because `video_file` is scoped by `device_id`, syncing paths is safe: each device ignores other devices' paths.
- Watch progress and metadata are global, so "Continue Watching" is consistent across machines.
- Conflict handling for v1: last write wins per row; progress writes are frequent and small, and only one device is typically active at a time. Document this and revisit if real conflicts appear.

## Milestones

Each milestone produces something runnable and directly verifiable, and builds on the previous one.

### M0 - React app shell

- Outcome: `npm run tauri dev` opens a window with the Netflix-like layout shell (sidebar/top bar, routes for Library, Media, Settings), styled with Tailwind + shadcn/ui.
- Implementation: add React, React Router, TanStack Query, Zustand; convert `main.ts` to `main.tsx`; set up Tailwind v4 (Vite plugin), shadcn theme tokens, and the `@/*` alias; init a few shadcn components; placeholder screens.
- Verify: run the app, navigate routes, inspect layout and theme tokens.
- Deferred: any real data or backend calls.

### M1 - First-run database mode + local SQLite

- Outcome: on first launch the app asks "Local or Remote?" Choosing Local creates a SQLite file, runs migrations, and remembers the choice across restarts; Local never asks for a Turso URL or token. Choosing Remote instead prompts for the Turso URL and auth token. Settings shows the DB path and schema version.
- Implementation: local config + device identity; `turso` local connection; migration runner; a health command; setup UI (Turso fields shown only for Remote).
- Verify: choose Local, restart, confirm no prompt, no Turso fields requested, and correct DB path/version.
- Deferred: Turso, real tables beyond migrations, secrets handling beyond file storage.

### M2 - Add first media via TMDB

- Outcome: enter a TMDB key in Settings, search a title, pick a result, confirm, and see the movie or show (with poster) appear in the library. For TV, seasons and episodes are stored and visible.
- Implementation: `TmdbClient`; add-media flow command; `media_item`/`season`/`episode` repositories; minimal library list and media detail (no styling polish).
- Verify: add "Dark Matter" (2024), open it, confirm seasons/episodes match TMDB.
- Deferred: movie file linking, watch state, dashboard polish.

### M3 - Library and media detail UI

- Outcome: dashboard shows added items as poster rows; opening a show lists seasons and episodes with air dates and a "no file linked / watched" state.
- Implementation: grid/row components, poster component, media detail with season selector and episode list.
- Verify: navigate library -> show -> season -> episode list with correct data.
- Deferred: search/filter, continue-watching, linking.

### M4 - Link a movie file and a single episode

- Outcome: a movie and a single episode can each be linked to a local file via a browse button; linked state is visible in the UI.
- Implementation: Tauri dialog for file selection; `link_movie_file`, single-episode link; `video_file` repository scoped to `device_id`.
- Verify: link an mp4 to a movie and an mkv to one episode, restart, confirm links persist.
- Deferred: folder scan, playback.

### M5 - Bulk folder scan for a TV series

- Outcome: select the Dark Matter folder and see a preview matching `S01E01`..`S01E09` to episodes, with the `.txt` files listed as ignored; confirm writes all links.
- Implementation: `scanner` service (walk, regex, season-folder handling); `scan_series_folder` and `apply_scan_matches`; preview/confirm UI with edit and conflict handling.
- Verify: run against `/Users/hadi/TV Shows/Dark.Matter.2024.S01.COMPLETE.720p.ATVP.WEBRip.x264-GalaxyTV[TGx]`, confirm 9 episodes linked and non-video files ignored.
- Deferred: fuzzy/numbered fallback matching, multi-episode files beyond flagging, subtitles.

### M6 - Embedded libVLC playback (highest-risk spike)

- Outcome: clicking a linked movie or episode plays it inside the app, with the control dock and the keyboard bindings working.
- Implementation (spike first): bundle libVLC + plugins; `PlayerService` FFI wrapper; embed with `set_hwnd`/`set_nsobject`/`set_xwindow`; `play_video`/`player_command`/`get_player_state`; control dock UI. Validate embedding on macOS, Windows, and Linux (X11/XWayland) before building the dock UI.
- Verify: play an mkv (not just mp4), toggle fullscreen, seek, adjust volume, select audio/subtitle tracks, watch it render embedded on each target OS.
- Deferred: resume persistence, next-episode auto-advance, subtitle sidecar UI polish.
- Risk note: if native embedding is unreliable on a platform, switch `PlayerService` to the borderless separate-window fallback and continue; the app-facing API does not change.

### M7 - Resume and watched tracking

- Outcome: playback position is saved automatically; episodes past the threshold are marked watched; the library shows a "Continue Watching" row and progress bars; manual watched toggle works.
- Implementation: progress polling + debounce write in `PlayerService`; `watch_progress` repository; `save_progress`, `set_watched`, `continue_watching`; resume on play; next-episode prompt at end.
- Verify: watch part of an episode, close, relaunch, resume; watch past 90% and confirm watched state and continue-watching updates.
- Deferred: per-device vs global progress nuances beyond the global model.

### M8 - Turso remote database + sync

- Outcome: Settings accepts a Turso URL and token, switches to Remote, syncs, and the same metadata/progress appear on a second machine while each machine keeps its own file links.
- Implementation: `turso::sync` connect + `push()`/`pull()`; `sync_now`/`get_sync_status`; sync on start/timer/after writes; sync status in the UI; connection test. Use the local sync server (`tursodb <file> --sync-server`) for development and verification without a cloud account.
- Verify: add media and progress on device A, sync, pull on device B, confirm metadata/progress appear and device B's own links are shown as unlinked for A's paths.
- Deferred: conflict resolution beyond last-write-wins, background sync daemon.

### M9 - Dashboard and library polish

- Outcome: Netflix-like dashboard with Continue Watching, Recently Added, and All Movies / All Shows rows; search and basic filters; polished player dock; keybindings help overlay.
- Implementation: layout/visual refinement, loading/empty/error states, keyboard help, responsive sizing.
- Verify: navigate the whole app, confirm states render correctly with empty and populated data.
- Deferred: performance work on very large libraries.

### M10 - Subtitles, tracks, and media polish

- Outcome: embedded subtitles and external `.srt`/`.ass` sidecars auto-load and are selectable; audio track selection; remembered language preferences.
- Implementation: libVLC subtitle/audio track selection and `sub-file` autodetect for sidecars, track-list enumeration, subtitle/audio menus in the control dock.
- Verify: play a file with embedded subs and one with an external `.srt`, switch tracks, confirm persistence of preference.
- Deferred: subtitle download/search, styling/theming of subtitles beyond libVLC defaults.

### M11 - Cross-platform packaging and hardening

- Outcome: installable builds for macOS, Windows, and Linux that include libVLC and start clean; secrets safe; graceful errors.
- Implementation: bundle per-platform libVLC shared libraries + plugins and set the plugin path; icons; macOS signing/notarization notes (including the libVLC libraries); error and empty-state coverage; edge cases (missing file, moved file, duplicate scan, corrupt media).
- Verify: install and run on each target OS; link and play a file with a native path on each.
- Deferred: auto-update, crash reporting, telemetry.

## Testing strategy

- Rust unit tests: filename parsing and scan matching (including multi-episode and season folders), TMDB response mapping, watched-threshold logic, migration runner.
- Rust integration tests: repositories against a temporary SQLite file.
- Frontend: Vitest + React Testing Library for components and hooks (linking preview, progress display, player controls) after those designs stabilize.
- Manual end-to-end checklist per milestone, using the real `TV Shows` and a sample movie file.
- Regression tests added for every defect found during hardening.

## Risks and mitigations

- Native player embedding on macOS/Windows/Linux webviews is the main technical risk. libVLC supports the embed API on all three, but compositing with the webview still needs validation. Mitigate with an early spike (M6), a `PlayerService` boundary, the keyboard-first control dock instead of HTML overlays, and a documented borderless-window fallback.
- Bundling libVLC: libVLC is LGPL v2.1+. Keep it dynamically linked, ship the shared libraries and plugins, provide license notices, and allow relinking as required. Code signing/notarization must cover the libVLC libraries. Add the compliance checklist during M11.
- Turso sync timing and conflicts. Mitigate with device-scoped paths, global-but-small progress rows, last-write-wins, a visible sync status, and the `turso` crate's push/pull model. The `turso` crate is pre-1.0, so pin versions and keep it behind the repositories.
- TMDB key and rate limits. User-supplied key, backend-only usage, local caching, and attribution text.
- Filename variety (specials, anime numbering, `1x01`, multi-episode files). Start with the specified patterns, flag uncertain matches for manual confirmation, and expand only with real cases.
- Cross-platform path handling. Always treat paths as opaque device-local strings; never derive one device's path from another's.

## Deferred / future ideas

- Automatic filesystem watching and incremental rescans.
- Per-device library scoping or per-device root mapping so the same show can live at different roots.
- Anime absolute-numbering and specials handling.
- Subtitle search/download and custom subtitle styling.
- Collections, tags, ratings, and sorting.
- Auto-update and release pipeline.
- OS keychain for secrets instead of the local config file.

## Resolved decisions

- Player: use libVLC (dynamically linked, LGPL) with per-OS native embedding; keep it behind `PlayerService` with a borderless-window fallback.
- Frontend styling: Tailwind CSS v4 + shadcn/ui, replacing CSS Modules/BEM.
- Database: the `turso` crate for both local SQLite and optional Turso sync (`push`/`pull`), replacing `libsql` embedded replicas.
- Progress: global, one value per movie/episode, shared across devices.
- Filename matching: auto-link `SxxExx` and `NxNN`; bare numbers and season-folder-only files require confirmation in the scan preview.
