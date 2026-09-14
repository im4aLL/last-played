# T009 - Wire library and media detail to real data

- Status: Todo
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
