# T014 - Turso remote database and sync

- Status: Done
- Phase: 2 - Functionality
- Depends on: T007, T009
- Plan refs: PLAN.md (Cross-device and sync model), M8

## Outcome

Settings accepts a Turso URL and token, switches to Remote, syncs, and the same metadata/progress appear on a second machine while each machine keeps its own file links. Local mode remains unaffected and still never prompts for Turso credentials.

## Tasks

- Remote mode keeps the local SQLite file as the working database and reconciles it with the remote Turso database over its HTTP `/v2/pipeline` API (no embedded replica/sync engine).
- Reconcile on app start, on a timer, and after meaningful writes (add media, progress, link changes).
- Commands: `sync_now`, `get_sync_status`.
- Settings: Turso fields shown only in Remote mode; connection test hits the remote HTTP API.
- Sync status indicator in the UI.
- Use the local sync server (`tursodb <file> --sync-server`) for development and verification without a cloud account.
- Conflict handling for v1: last write wins per row on `updated_at`; document it.

## Verify

- Add media and progress on device A, sync, pull on device B.
- Confirm metadata/progress appear on B and that A's paths show as unlinked on B.
- Confirm Local mode still never asks for a URL or token.

## Out of scope

- Conflict resolution beyond last-write-wins and a background sync daemon.

## Progress notes

Implemented end to end and verified against a real Turso database.

- Data layer: `db/mod.rs` is now a `Database` struct holding the local `turso` connection plus an optional `RemoteClient`. Both modes open the same local file and run migrations, so Remote mode keeps working offline. `open_remote` builds the HTTP client from the stored URL/token; no network happens at open time.
- `services/remote.rs`: minimal Turso HTTP client. Normalizes `libsql://` to `https://`, posts `execute` statements to `/v2/pipeline` with a bearer token, and maps rows to/from `turso::Value`. Empty token is allowed for a local sync server.
- `services/sync.rs`: `SyncManager` tracks running/dirty state and last-synced time. Reconciliation reads each table on both sides from one snapshot, then:
  - inserts rows missing on either side (`INSERT OR IGNORE`),
  - updates rows in both directions only when the newer `updated_at` wins (last write wins).
  - Tables: `device`, `media_item`, `season`, `episode`, `watch_progress`, parent-first for foreign keys.
- Remote schema: created from the local `sqlite_master` DDL with `IF NOT EXISTS` on every sync, so the remote schema stays in step with migrations without a second hand-maintained list.
- File links: `video_file` is device-local. Only this device's rows are mirrored to the remote (insert missing, delete remote rows unlinked locally). Other devices' paths are never pulled, so another machine's files simply read as unlinked. This also avoids resurrecting an unlinked file.
- Writes trigger sync: add/refresh media, save progress, set watched, link/unlink a file, and apply scan matches, plus a background loop every 30s.
- Commands `sync_now` and `get_sync_status` are registered in `lib.rs`. Settings shows a "Sync now" button plus last-synced/failure text in Remote mode only, and a sync indicator in the app shell header. `test_db_connection` pings the remote HTTP API in Remote mode.
- Local mode never builds a `RemoteClient`, so it never asks for a Turso URL or token.
- Dev/verification uses the local sync server: run `tursodb <file> --sync-server 0.0.0.0:PORT`, then set the Turso URL to `http://localhost:PORT` with an empty token.

Verified by hand: media and progress added on device A appear on device B after sync, A's file paths show as unlinked on B, and Local mode never asks for a URL or token.
