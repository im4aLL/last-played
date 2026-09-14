# T015 - Subtitles, audio tracks, preferences

- Status: Todo
- Phase: 2 - Functionality
- Depends on: T012, T013
- Plan refs: PLAN.md (Player design), M10

## Outcome

Embedded subtitles and external `.srt`/`.ass` sidecars auto-load and are selectable, audio track selection works, and language preferences are remembered.

## Tasks

- libVLC track enumeration and selection commands for audio and subtitle tracks.
- Sidecar autodetect for `.srt`/`.ass` next to the video file.
- Subtitle/audio menus in the control dock.
- Persist preferred subtitle/audio language and apply it on next play.
- Keyboard bindings S (cycle subtitle), A (cycle audio), C (toggle subtitles) wired to real tracks.

## Verify

- Play a file with embedded subs and one with an external `.srt`; switch tracks.
- Confirm the chosen language preference persists across launches.

## Out of scope

- Subtitle download/search and styling beyond libVLC defaults.
