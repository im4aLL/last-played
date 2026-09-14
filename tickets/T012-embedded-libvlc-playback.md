# T012 - Embedded libVLC playback (spike first)

- Status: Todo
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
