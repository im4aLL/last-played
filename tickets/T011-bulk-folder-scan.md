# T011 - Bulk folder scan and apply matches

- Status: Todo
- Phase: 2 - Functionality
- Depends on: T010
- Plan refs: PLAN.md (Folder scan and bulk linking), M5

## Outcome

Select the Dark Matter folder, see a preview matching `S01E01`..`S01E09` to episodes with non-video files listed as ignored, then confirm to write all links.

## Tasks

- `scanner` service: recursive walk with `walkdir`, video extension filter, ignore samples and non-video files.
- Parse `S(\d{1,2})E(\d{1,3})` and `(\d{1,2})x(\d{2,3})`, case-insensitive; multi-episode names link to the first episode and are flagged.
- Low-confidence cases (bare numbers, season-folder-only) go to a confirmation list and are never auto-linked.
- Produce a proposal split into auto-linked, needs-confirmation, and unmatched, with conflicts called out.
- Commands: `scan_series_folder`, `apply_scan_matches`.
- Preview/confirm UI with edit and conflict handling.
- `apply_scan_matches` replaces existing links for the same episodes on this device.

## Verify

- Run against `/Users/hadi/TV Shows/Dark.Matter.2024.S01.COMPLETE.720p.ATVP.WEBRip.x264-GalaxyTV[TGx]`; confirm 9 episodes linked and non-video files ignored.
- Unit test filename parsing including multi-episode and season folders.

## Out of scope

- Fuzzy/numbered fallback matching and subtitles.
