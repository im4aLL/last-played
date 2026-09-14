# T008 - TMDB client and add media

- Status: Todo
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
