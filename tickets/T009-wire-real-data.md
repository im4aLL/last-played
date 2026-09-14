# T009 - Wire library and media detail to real data

- Status: Done
- Phase: 2 - Functionality
- Depends on: T003, T004, T008
- Plan refs: PLAN.md (Data model), M3

## Outcome

The library dashboard and media detail read from the real database through TanStack Query instead of mock data. Rows populate from added media; the media detail lists real seasons and episodes with their linked/watched state placeholders.

## Tasks

- Replace the mock data module with typed `api.ts` wrappers over `invoke`.
- `list_media`, `get_media` commands and repositories.
- Library rows: Recently Added, All Movies, All Shows (Continue Watching stays empty until T013).
- Media detail reads seasons/episodes and shows link/watched state.
- Loading, empty, and error states reflect real query state.

## Verify

- Added media appears in the library after add.
- Opening a show lists the correct seasons and episodes.
- Relaunching the app still shows the data.

## Out of scope

- Linking, playback, progress, and search/filter.

## Notes

- Backend: `commands/library.rs` adds `list_media` and `get_media` with DTOs shaped to the existing frontend types (`MediaSummary`, `MediaDetail`, `SeasonDetail`, `EpisodeDetail`). Repositories gained read helpers: `media_item::list_all` (ordered by `added_at` desc), `season::list_for_media` (by `season_number`), and `episode::list_for_media` (by `episode_number`).
- Frontend: TanStack Query is now wired (`QueryClientProvider` in `App.tsx`, `staleTime` 30s, one retry). `useLibrary` and `useMedia` read through typed `api.ts` wrappers (`listMedia`, `getMedia`); the mock modules and the `?demo=empty|error` scenarios were removed, so loading/empty/error states come from real query state.
- Continue Watching stays empty and `progress`/`fileLinked` are placeholders (`null`/`false`) until linking (T010) and progress (T013). Genres are not stored in the data model yet, so `genres` is an empty list.
- Recently Added is capped at 12 items; All Movies and All Shows list the full set.
- `player-mock.ts` now sources its detail through `getMedia` because `media-mock.ts` was removed; playback itself is still mock until T012.
- Adding media invalidates the `["media"]` query so the library reflects the new item.
- Verified with `cargo check`/`clippy`/`fmt`, `npm run build` (tsc + vite), eslint, prettier, and vitest. Read SQL was checked against the existing local `library.db` (Dark Matter: 2 seasons, 19 episodes).
- Manual verification (add media, open a show, relaunch) needs `tauri dev` and a real TMDB key.
