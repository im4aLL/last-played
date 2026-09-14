# Tickets

Incremental delivery plan for Last Played, derived from `PLAN.md`. Order is intentional: finish setup first (T001), build the whole frontend against mock data so the look and feel can be reviewed (T002 to T006), then add real functionality one ticket at a time (T007 onward).

Each ticket is a standalone file named `TNNN-short-title.md` and carries its own `Status` field. Update the ticket file and the board below together whenever status changes.

## Status legend

- Todo - not started.
- In Progress - actively being worked.
- Blocked - waiting on a dependency or a decision.
- Done - implemented and verified.
- Deferred - intentionally postponed.

## Board

| ID | Title | Phase | Depends on | Status |
|----|-------|-------|------------|--------|
| T001 | Project setup and tooling | 0 - Setup | none | Done |
| T002 | App shell: layout, navigation, theme | 1 - Frontend | T001 | Done |
| T003 | Library dashboard (mock) | 1 - Frontend | T002 | Done |
| T004 | Media detail: seasons and episodes (mock) | 1 - Frontend | T002 | Done |
| T005 | First-run setup and Settings (mock) | 1 - Frontend | T002 | Done |
| T006 | Player UI: surface, dock, keybindings (mock) | 1 - Frontend | T002 | Done |
| T007 | Local database and Local mode | 2 - Functionality | T001, T005 | Done |
| T008 | TMDB client and add media | 2 - Functionality | T007 | Todo |
| T009 | Wire library and media detail to real data | 2 - Functionality | T003, T004, T008 | Todo |
| T010 | Link a single movie or episode file | 2 - Functionality | T009 | Todo |
| T011 | Bulk folder scan and apply matches | 2 - Functionality | T010 | Todo |
| T012 | Embedded libVLC playback (spike first) | 2 - Functionality | T006, T010 | Todo |
| T013 | Resume and watched tracking | 2 - Functionality | T012 | Todo |
| T014 | Turso remote database and sync | 2 - Functionality | T007, T009 | Todo |
| T015 | Subtitles, audio tracks, preferences | 2 - Functionality | T012, T013 | Todo |
| T016 | Dashboard and library polish | 2 - Functionality | T009, T011, T013 | Todo |
| T017 | Cross-platform packaging and hardening | 2 - Functionality | T012, T014, T015 | Todo |

## Working agreement

- One ticket at a time. Keep the app runnable after each.
- A ticket is Done only when its Verify steps pass and its tests are added.
- Frontend phase is intentionally mock-data only, so the visual design can be reviewed before any backend work.
