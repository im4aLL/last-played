# T003 - Library dashboard (mock)

- Status: Done
- Phase: 1 - Frontend
- Depends on: T002
- Plan refs: PLAN.md (Frontend structure), M3, M9

## Outcome

The library dashboard shows horizontal rows: Continue Watching, Recently Added, All Movies, All Shows. Poster cards with title, year, and a progress bar where applicable. Driven entirely by a local mock data module.

## Tasks

- `PosterCard` component (poster image, title, optional progress bar, optional watched badge).
- Horizontal scrolling `Row` component with a title and overflow handling.
- Loading, empty, and error states for each row.
- A typed mock data module in the frontend (no backend) covering movies and shows.
- Wire the dashboard route to render the rows from mock data.

## Verify

- Dashboard renders all four rows with mock posters.
- Rows scroll horizontally without layout breakage.
- Empty state renders when a row has no items.

## Out of scope

- Real data, TMDB, linking, or playback.
