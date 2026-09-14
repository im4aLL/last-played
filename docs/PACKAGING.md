# Packaging and hardening

This document covers how Last Played is packaged for macOS, Windows, and Linux, how bundled libVLC is staged, the signing/notarization steps, the LGPL compliance checklist, and the manual verification checklist for T017.

## Bundled libVLC

libVLC is dynamically linked and shipped with the app so users do not need a system VLC install.

1. Run `npm run stage:vlc` on the build machine (or pass `--from <dir>` / set `LAST_PLAYED_VLC_SOURCE`).
2. The script copies the shared libraries and the plugin cache into `src-tauri/vlc/`:
   - macOS: `vlc/lib/libvlc*.dylib`, `vlc/lib/libvlccore*.dylib`, `vlc/plugins/`
   - Windows: `vlc/libvlc.dll`, `vlc/libvlccore.dll`, `vlc/plugins/`
   - Linux: `vlc/lib/libvlc.so*`, `vlc/lib/libvlccore.so*`, `vlc/plugins/`
3. `src-tauri/tauri.conf.json` lists `vlc/**/*` under `bundle.resources`, so the staged folder is copied into the app bundle at package time.

At runtime `PlayerService` resolves the library and plugins in this order: the bundled `vlc` folder, `LAST_PLAYED_VLC_DIR`, `VLC_PLUGIN_PATH`, then per-OS system locations. Development builds without a staged folder keep using the system VLC.

Do not commit the staged binaries; `src-tauri/vlc/*` is ignored except the placeholder `README.txt`.

## Icons and bundle metadata

Icons live in `src-tauri/icons` and are referenced by `bundle.icon`. `tauri.conf.json` sets the product name, version, identifier, category, descriptions, copyright, and the macOS minimum system version (10.15). Keep `productName` and `identifier` stable: the app config and data directories derive from the identifier.

## macOS signing and notarization

The app bundle contains the app binary plus the libVLC libraries and plugins, all of which must be signed. Nested code must be signed before the outer bundle.

1. Build: `npm run stage:vlc && npm run tauri build`.
2. Sign nested code first, then the app. Use a hardened runtime and a timestamp:
   ```sh
   codesign --force --options runtime --timestamp \
     --sign "Developer ID Application: <name> (<team>)" \
     "target/release/bundle/macos/last-played.app/Contents/Resources/vlc/lib/"*.dylib
   codesign --force --options runtime --timestamp --deep \
     --sign "Developer ID Application: <name> (<team>)" \
     "target/release/bundle/macos/last-played.app/Contents/Resources/vlc/plugins"
   codesign --force --options runtime --timestamp \
     --sign "Developer ID Application: <name> (<team>)" \
     "target/release/bundle/macos/last-played.app"
   ```
   Tauri can sign the app automatically when `APPLE_CERTIFICATE`, `APPLE_SIGNING_IDENTITY`, and notarization credentials are set in the environment; nested libVLC libraries may still need the explicit pass above.
3. Notarize and staple:
   ```sh
   xcrun notarytool submit "last-played.app.zip" --keychain-profile <profile> --wait
   xcrun stapler staple "last-played.app"
   ```
4. Verify: `codesign --verify --deep --strict --verbose=2 "last-played.app"` and `spctl --assess --type execute "last-played.app"`.

If notarization rejects the bundle, check that every `.dylib` and plugin bundle carries a valid Developer ID signature and a secure timestamp.

## Windows and Linux notes

- Windows: the WebView2 runtime is required (Tauri default install mode). Staged DLLs must sit beside the executable; `libvlccore.dll` is preloaded from the same folder so `libvlc.dll` resolves it.
- Linux: the AppImage and `.deb` bundle the staged libraries. Keep `bundle.linux.deb.depends` aligned with the distro packages the WebView needs (Tauri adds WebKitGTK dependencies automatically). X11 is used directly; under Wayland libVLC runs through XWayland.

## LGPL compliance checklist

libVLC is LGPL v2.1 or later. To keep the app closed-source, all of the following must hold:

- [ ] libVLC is dynamically linked (loaded at runtime via `libloading`), never statically linked.
- [ ] The libVLC shared libraries and plugins are shipped unmodified, as separate files in `Resources/vlc` (macOS) or beside the executable (Windows/Linux).
- [ ] Users can replace the bundled libVLC with their own build (allow relinking): the libraries are plain files and the app discovers them at runtime.
- [ ] The LGPL license text and libVLC copyright notices are shipped. Add a tracked notice file (for example `src-tauri/vlc/NOTICE.txt`, un-ignored like `README.txt`) and surface it in an About/notices screen.
- [ ] The build records the exact libVLC version used, so the corresponding source can be offered on request.

## Error and empty-state coverage

Hardening covers these cases; each surfaces a message instead of a silent failure:

- Missing or moved file: `play_video` checks the path before starting and returns a "no longer exists, it may have been moved" error. `VideoFileInfo.missing` (computed on read) drives a "file missing" state and relink prompt in the media detail UI.
- Corrupt or unsupported media: libVLC reports `STATE_ERROR`; the player hook turns that into a "could not be played, corrupt or unsupported" error state with a retry action.
- Duplicate scan: `apply_scan_matches` rejects two files for the same episode and two episodes for the same file, and `replace_for_target` makes re-applying a scan idempotent (existing links for an episode on this device are replaced, other devices' links are untouched).
- Empty library and empty season/scan results render the shared `EmptyState` component.

## Cross-platform path handling

Video paths are opaque device-local strings. They are stored as text, never parsed to derive another device's path, and every read or write of `video_file` is scoped by `device_id` (see `db/repositories/video_file.rs` and `services/sync.rs`). Windows backslashes, macOS/Linux forward slashes, and non-UTF-8-friendly names all round-trip through `String` and `to_string_lossy`. Sync pushes only this device's `video_file` rows; other devices show those titles as unlinked.

## Manual verification checklist

macOS:

- [ ] `npm run stage:vlc && npm run tauri build`, install the `.app`, and launch it with no system VLC present.
- [ ] Link and play an `.mkv` (not just `.mp4`) with a native path; seek, change tracks, toggle fullscreen.
- [ ] Rename the linked file, reopen the media page, and confirm the "file missing" state, then relink.

Windows: stage VLC, build, install, and repeat the play/seek/track checks with a backslash path.

Linux: stage VLC, build the AppImage/`.deb`, and run under X11 and Wayland (XWayland).

All platforms:

- [ ] Confirm `config.json` is not world-readable (Unix) and that no TMDB key or Turso token appears in the database or the synced remote database.
- [ ] Confirm the plugin path is the bundled `vlc/plugins` (log `VLC_PLUGIN_PATH` or set a debug breakpoint) with no system VLC installed.
