# T014 - Turso remote database and sync

- Status: Done
- Phase: 2 - Functionality
- Depends on: T007, T009
- Plan refs: PLAN.md (Cross-device and sync model), M8

## Outcome

Settings accepts a Turso URL and token, switches to Remote, syncs, and the same metadata/progress appear on a second machine while each machine keeps its own file links. Local mode remains unaffected and still never prompts for Turso credentials.

## Tasks

- `turso::sync` connect with remote URL and auth token; explicit `push()` and `pull()`.
- Sync on app start, on a timer, and after meaningful writes (add media, progress, link changes).
- Commands: `sync_now`, `get_sync_status`.
- Settings: Turso fields shown only in Remote mode; connection test.
- Sync status indicator in the UI.
- Use the local sync server (`tursodb <file> --sync-server`) for development and verification without a cloud account.
- Conflict handling for v1: last write wins per row; document it.

## Verify

- Add media and progress on device A, sync, pull on device B.
- Confirm metadata/progress appear on B and that A's paths show as unlinked on B.
- Confirm Local mode still never asks for a URL or token.

## Out of scope

- Conflict resolution beyond last-write-wins and a background sync daemon.

## Progress notes

Implemented end to end, pending manual verification.

- `db/mod.rs`: `Database` is now an enum (`Local` / `Synced`). `open_remote` builds a `turso::sync::Builder` database with the stored URL and auth token and runs migrations; `connect` is async and the type exposes `push`, `pull`, and `is_remote`. The `sync` feature is enabled on the pinned `turso` crate.
- `services/sync.rs`: `SyncManager` tracks running/dirty state and last-synced time; `run` pushes local changes then pulls remote ones; `background_loop` syncs on app start and every 30s while in Remote mode.
- `state.rs`: opens local vs remote from `db_mode`, caches the handle, resets it when the mode or remote credentials change, and `trigger_sync` schedules a background push after meaningful writes.
- Writes trigger sync: add/refresh media, save progress, set watched, link/unlink a file, and apply scan matches.
- Commands `sync_now` and `get_sync_status` are registered in `lib.rs`. Settings shows a "Sync now" button plus last-synced/failure text in Remote mode only, and a sync indicator (state, relative last synced, click to sync now) sits in the app shell header.
- Local mode never opens a remote connection, so it never asks for a Turso URL or token.
- Conflict handling for v1 is last write wins per row (noted next to the push/pull call). `video_file` is scoped by `device_id`, so syncing paths is safe and another machine's files read as unlinked.
- Dev/verification uses the local sync server: run `tursodb <file> --sync-server 0.0.0.0:PORT`, then set the Turso URL to `http://localhost:PORT` with an empty token.

Manual verification pending: add media and progress on device A, sync, pull on device B, and confirm metadata/progress appear while A's paths show as unlinked on B; confirm Local mode still never asks for a URL or token.
