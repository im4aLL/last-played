# T012 - Embedded libVLC playback (spike first)

- Status: In Progress
- Phase: 2 - Functionality
- Depends on: T006, T010 or T011 for a linked file
- Plan refs: PLAN.md (Player design, Risks), M6

## Outcome

Clicking a linked movie or episode plays it inside the app window, with the control dock and keyboard bindings working. Validate native embedding on macOS, Windows, and Linux before finishing the dock integration.

## Tasks

- Spike: bundle libVLC + plugins and embed with the per-OS handle (`set_hwnd` / `set_nsobject` / `set_xwindow`) on all three platforms.
- `PlayerService`: thin Rust FFI wrapper (play/pause, seek, position, volume, track selection, state events).
- Set the plugin search path (`VLC_PLUGIN_PATH`) per platform.
- Commands: `play_video`, `player_command`, `get_player_state`, `stop_player`.
- Wire the dock UI to real player state; keep dock controls and keybindings from T006.
- Persist/restore nothing yet (that is T013).
- Fallback: if embedding is unreliable on a platform, switch `PlayerService` to a borderless native video window; the app-facing API stays the same.

## Verify

- Play an mkv (not just mp4) embedded on each target OS.
- Toggle fullscreen, seek, change volume, and select audio/subtitle tracks.
- Confirm the dock hides/reappears and keys work during playback.

## Out of scope

- Resume persistence, next-episode auto-advance, and subtitle sidecar polish.

## Progress notes

Implemented end to end, pending manual verification.

- `services/player` (`ffi.rs`, `mod.rs`, `embed.rs`): dynamically loads bundled/system libVLC with `libloading`, preloads `libvlccore` on macOS, sets `VLC_PLUGIN_PATH`, and wraps the play/pause/seek/volume/rate/track/state subset of the FFI it needs. Library discovery resolves `LAST_PLAYED_VLC_DIR`, then per-OS defaults (`/Applications/VLC.app` on macOS).
- macOS embed: a child `NSView` is created on the main thread as a sibling of the webview and passed to `set_nsobject`; the frontend reports the video rect and the view is repositioned to reserve dock space. Windows uses `set_hwnd` and Linux/X11 uses `set_xwindow` through the `NativeSurface` abstraction.
- Commands (`commands/player.rs`): `play_video`, `player_command`, `get_player_state`, `set_player_bounds`, `stop_player`, registered in `lib.rs`. The surface is hidden on stop and until first positioned.
- Frontend: `usePlayer` now drives real playback (play on load, 500ms state polling, command dispatch), `player-mock` carries the linked file path per item, the dock uses real audio/subtitle tracks and reserved space, and linked episodes get a Play link (`/player/<mediaId>?episode=<episodeId>`). The click-on-video binding was dropped since the native surface intercepts pointer events.

Remaining to verify manually: play an mkv embedded on macOS (fullscreen, seek, volume, track selection, dock hide/reveal, keys). Windows and Linux currently embed into the window handle directly and do not yet reserve dock space (the `NativeSurface` fallback path); that needs validation before this ticket is Done.

