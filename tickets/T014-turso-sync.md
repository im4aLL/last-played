# T014 - Turso remote database and sync

- Status: Todo
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
