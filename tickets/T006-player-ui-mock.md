# T006 - Player UI: surface, dock, keybindings (mock)

- Status: Todo
- Phase: 1 - Frontend
- Depends on: T002
- Plan refs: PLAN.md (Player design)

## Outcome

The player view is visually complete and interactive against mock state, without any real video. It shows a reserved video region, a control dock below the video, keyboard handling, and a keyboard help overlay. This validates the look and the interaction model before the libVLC work.

## Tasks

- Player route and layout with a reserved video region (a placeholder surface for now).
- Control dock below the video: play/pause, seek, volume, track menus, next/previous episode, fullscreen.
- Dock auto-hide after inactivity; reappear on mouse move or key press.
- Keyboard bindings from PLAN.md (space/K, arrows, J/L, M, F, Esc, N/B, S, A, C, `[`/`]`).
- Keyboard help overlay listing the bindings.
- A mock player-state hook so controls reflect state (playing, position, duration, volume).

## Verify

- Keys and dock clicks update the mock state and the UI.
- Dock hides and reappears correctly.
- Fullscreen layout toggles.
- Help overlay opens and closes.

## Out of scope

- Real playback, real media, resume, or progress persistence.
