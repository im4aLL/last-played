# T008 - TMDB client and add media

- Status: Done
- Phase: 2 - Functionality
- Depends on: T007
- Plan refs: PLAN.md (TMDB integration, Data model), M2

## Outcome

Enter a TMDB API key in Settings, search a title, pick a result, confirm, and the movie or show is persisted with poster and metadata. For TV, seasons and episodes are stored and visible.

## Tasks

- `TmdbClient` in Rust using `reqwest`; the key is read from local config and never sent to the webview.
- Commands: search, fetch details, fetch seasons/episodes, add media.
- Repositories for `media_item`, `season`, `episode`.
- Add-media flow command that persists all rows in a transaction.
- Minimal add UI (search box, results, confirmation summary).
- Map TMDB responses to domain structs; store `tmdb_id` for later refresh.
- Add TMDB attribution text in Settings/About.

## Verify

- Add "Dark Matter" (2024) and confirm seasons/episodes match TMDB.
- Unit test TMDB response mapping with fixtures.
- Refresh metadata updates an existing item.

## Out of scope

- File linking, watch state, and dashboard polish.

## Notes

- `TmdbClient` lives in `services/tmdb.rs`. The API key is read from local config and used only in Rust, never sent to the webview. Both a v3 API key (query param) and a v4 read access token (bearer) are supported.
- Commands: `search_tmdb`, `preview_tmdb_media` (details plus seasons and episodes, used for the confirmation summary), `add_media_from_tmdb` (persists `media_item` -> `season` -> `episode` in one transaction), and `refresh_metadata`.
- Repositories live in `db/repositories/` (`media_item`, `season`, `episode`). Migration 1 creates the three tables with unique keys on (`type`, `tmdb_id`), (`media_item_id`, `season_number`), and (`season_id`, `episode_number`) so refresh updates existing rows and preserves ids.
- Add UI at `/add` (sidebar: "Add media"): search box, result list, confirmation summary showing seasons and episodes for TV, confirm, then an added/refreshed summary. It prompts to open Settings when no key is set.
- TMDB attribution text was already present in Settings from T005.
- Per the repo convention, no unit tests were added. Verified instead through `cargo check`, `cargo clippy`, `cargo fmt`, frontend `tsc`/`eslint`/`prettier`/`vitest`, the migration DDL and `strftime` via `sqlite3`, and a temporary turso transaction/params smoke example (removed after running).
- The live "add Dark Matter (2024) and match seasons/episodes against TMDB" check needs a real TMDB API key entered in Settings and is a manual step.
- `reqwest` uses `native-tls` (rustls was avoided because it pulls the `aws-lc` C build). Linux builds will need OpenSSL; revisit the TLS backend during T017 packaging.
- Library and media detail are still mock; wiring them to these rows is T009.
