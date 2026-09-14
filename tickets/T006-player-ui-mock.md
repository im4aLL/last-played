# T006 - Player UI: surface, dock, keybindings (mock)

- Status: Done
- Phase: 1 - Frontend
- Depends on: T002
- Plan refs: PLAN.md (Player design)

## Outcome

The player view is visually complete and interactive against mock state, without any real video. It shows a full-window video region, controls overlaid on the video, keyboard handling, and a keyboard help overlay. This validates the look and the interaction model before the libVLC work.

## Tasks

- Player route and layout with a full-window video region (a placeholder surface for now); the player opens fullscreen on entry.
- Control dock overlaid on the bottom of the video: play/pause, seek, volume, track menus, next/previous episode, fullscreen.
- Dock auto-hide after inactivity; reappear on mouse move or key press, with the cursor hidden while it is away.
- Keyboard bindings from PLAN.md (space/K, arrows, J/L, M, F, Esc, N/B, S, A, C, `[`/`]`).
- Keyboard help overlay listing the bindings.
- A mock player-state hook so controls reflect state (playing, position, duration, volume).

## Verify

- Keys and dock clicks update the mock state and the UI.
- Dock hides and reappears correctly.
- Fullscreen layout toggles.
- Help overlay opens and closes.

## Notes

- The overlay dock is safe while playback is mocked. T012 must re-check it, because the native libVLC surface composites above the webview (see PLAN.md Player design); if it does not work there, fall back to the reserved-height dock below the video.

## Out of scope

- Real playback, real media, resume, or progress persistence.
