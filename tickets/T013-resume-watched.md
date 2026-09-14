# T013 - Resume and watched tracking

- Status: Done
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

## Progress notes

Implemented end to end, pending manual verification.

- Migration v3 adds `watch_progress` (`target_id` = episode id or media id, plus `media_item_id`, `episode_id`, `position_seconds`, `duration_seconds`, `watched`, `updated_at`) with `db/repositories/watch_progress.rs` for get/upsert/list. Progress is global, not device-scoped.
- Commands (`commands/watch.rs`): `save_progress`, `get_progress`, `set_watched`, `continue_watching`, registered in `lib.rs`. `save_progress` marks watched once the position passes `player.watchedThreshold` (default 90%) and never clears an existing watched flag from a partial replay. `set_watched` clears the resume point when unwatching.
- Library/detail commands now return real progress: `list_media` aggregates the movie's own progress or the newest in-progress episode for shows, `get_media` attaches per-episode and movie progress.
- Frontend: `usePlayer` writes progress every 5s while playing plus forced writes on pause, end, episode switch, and unmount, and invalidates `["media"]` on exit; `use-library` fills the Continue Watching row from `continue_watching`; manual watched toggles on the movie hero and each episode row; a next-episode prompt appears when an episode ends and a linked next episode exists.
- Resume already flowed through `player-mock` (`startPositionSeconds` from progress); it now uses real data.

Manual verification pending: watch part of an episode, close, relaunch, and confirm resume; watch past 90% and confirm watched plus Continue Watching update; toggle watched manually and confirm it persists.
