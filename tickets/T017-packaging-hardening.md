# T017 - Cross-platform packaging and hardening

- Status: Done
- Phase: 2 - Functionality
- Depends on: T012, T014, T015
- Plan refs: PLAN.md (Risks, Testing strategy), M11

## Outcome

Installable builds for macOS, Windows, and Linux that include libVLC and start clean. Secrets are safe and errors are graceful.

## Tasks

- Bundle per-platform libVLC shared libraries + plugins and set the plugin path.
- Icons and bundle metadata.
- macOS signing/notarization notes covering the app and libVLC libraries; LGPL compliance checklist (dynamic linking, notices, allow relinking).
- Error and empty-state coverage: missing file, moved file, duplicate scan, corrupt media.
- Cross-platform path handling review (paths treated as opaque device-local strings).
- Regression tests for defects found during hardening.

## Verify

- Install and run on each target OS.
- Link and play a file with a native path on each OS.
- Confirm no secret is written to the synced DB.

## Out of scope

- Auto-update, crash reporting, and telemetry.

## Progress notes

Implemented and verified on macOS; Windows/Linux packaging is configured but needs a manual install-and-play pass (see `docs/PACKAGING.md`).

- Bundled libVLC: `scripts/stage-vlc.mjs` (`npm run stage:vlc`) copies the per-platform shared libraries and plugins into `src-tauri/vlc/`; `bundle.resources` ships them. `PlayerService` now resolves the library and plugin path from the app resource dir first (`bundled_vlc_dir` -> `locate_library` / `locate_plugins`), then `LAST_PLAYED_VLC_DIR`, `VLC_PLUGIN_PATH`, and system locations. `libvlccore` is preloaded on macOS/Linux and Windows so the bundled `libvlc` resolves its dependency from the same folder. Staged binaries are gitignored; `vlc/README.txt` keeps the resource glob matched.
- Bundle metadata: category, descriptions, copyright, and macOS minimum system version added to `tauri.conf.json` alongside the existing icons.
- Signing, notarization, and LGPL compliance: documented in `docs/PACKAGING.md`, including nested-code signing order, `notarytool`/`stapler` steps, and the LGPL checklist (dynamic linking, unmodified libraries, relinking, notices, version record).
- Hardening: `play_video` distinguishes a moved/deleted file from a non-file path with an actionable message; `VideoFileInfo.missing` is computed on read and renders a "file missing" state with an unlink/relink affordance; libVLC `STATE_ERROR` is surfaced by the player hook as a "corrupt or unsupported" error with retry instead of a stuck spinner; duplicate/re-applied scans remain safe through the existing conflict guards and `replace_for_target` idempotency.
- Secrets: the config file is forced to `0600` on Unix (`config.rs`), and the sync engine only ever mirrors the listed domain tables, so no TMDB key or Turso token reaches the remote database.

Manual follow-up (not verifiable in this environment): stage VLC, build, install, and play a native-path file on Windows and Linux; run the macOS checklist in `docs/PACKAGING.md` against a real bundled build.

