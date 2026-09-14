# T013 - Resume and watched tracking

- Status: Todo
- Phase: 2 - Functionality
- Depends on: T012
- Plan refs: PLAN.md (Data model, Player design), M7

## Outcome

Playback position is saved automatically, episodes past the threshold are marked watched, the library shows a Continue Watching row with progress bars, and playback resumes where it left off. Manual watched toggle works.

## Tasks

- `watch_progress` repository keyed by media/episode (global, not device).
- Progress polling + debounce write in `PlayerService`, plus writes on pause/stop/close.
- Commands: `save_progress`, `get_progress`, `set_watched`, `continue_watching`.
- Resume on play using the saved position.
- Configurable watched threshold (default 90%) from player preferences.
- Continue Watching row and progress bars on poster cards.
- Next-episode prompt at end of an episode.

## Verify

- Watch part of an episode, close, relaunch, and resume from the saved position.
- Watch past 90% and confirm the watched state and Continue Watching update.
- Toggle watched manually and confirm it persists.

## Out of scope

- Per-device progress nuances beyond the global model.
