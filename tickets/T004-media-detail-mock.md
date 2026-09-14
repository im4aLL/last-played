# T004 - Media detail: seasons and episodes (mock)

- Status: Done
- Phase: 1 - Frontend
- Depends on: T002
- Plan refs: PLAN.md (Frontend structure), M3

## Outcome

A media detail page for both movies and shows. Shows list seasons with a season selector and an episode list showing episode number, name, air date, runtime, and a watched/linked placeholder state. Movies show overview, runtime, and a play button placeholder. Mock data only.

## Tasks

- `MediaDetail` layout with hero/backdrop, poster, title, overview, and metadata.
- Season selector and episode list for shows.
- Per-episode state badges: unlinked, linked, watched, in-progress (mock values).
- Baseline responsive layout for the episode list.

## Verify

- Navigate to a mock show, switch seasons, and see episodes.
- Navigate to a mock movie and see its detail layout.
- Badges render for each state.

## Out of scope

- Real playback, real linking, or persistence.
