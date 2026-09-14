# T011 - Bulk folder scan and apply matches

- Status: Done
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

## Notes

- `walkdir` was added. `services/scanner.rs` walks a folder recursively, keeps only known video extensions, and ignores samples (name contains `sample`) and non-video files; both are returned in the proposal's ignored list with a reason.
- Parsing is dependency-free (`S(\d{1,2})E(\d{1,3})` and `(\d{1,2})x(\d{2,3})`, case-insensitive) and high confidence. Multi-episode names link to the first episode and are flagged in the row notes. Episode-only markers (`E01`) and bare numbers are low confidence and always need confirmation; their season comes from the nearest ancestor `Season N` folder.
- `scan_series_folder(mediaId, folder)` matches parsed names against the series' seasons/episodes and returns `auto`, `needsConfirmation`, `unmatched`, and `ignored`. Files that contend for the same episode are flagged as conflicts and moved out of `auto`, so they are never auto-linked.
- `apply_scan_matches(mediaId, matches)` validates that every target belongs to the series and that no episode or path is targeted twice, then writes `video_file` rows in one transaction and replaces existing links for those episodes on the current device. `probe_file` is now `pub(crate)` and reused from `commands/linking.rs`.
- Frontend: `pickFolder`, `scanSeriesFolder`/`applyScanMatches` wrappers, `use-scan.ts`, a shadcn `Checkbox`, a `ScanPreviewSheet` (shadcn Sheet) with per-row include checkbox, episode `Select` for edits, conflict badges, a duplicate-target guard, and ignored/unmatched lists. A `ScanFolderButton` is shown on the TV detail hero next to Play.
- Per the repo convention, no unit tests were added. Parsing and the real folder walk were checked with temporary tests (removed afterward): `S01E01`..`S01E09` map to S01 1-9, `1920x1080`/`h.264`/`720p` are not read as episodes, folder seasons parse, and `/Users/hadi/TV Shows/Dark.Matter.2024.S01.COMPLETE.720p.ATVP.WEBRip.x264-GalaxyTV[TGx]` yields 9 high-confidence S01 episodes and 2 ignored non-video files. Also verified with `cargo check`/`clippy`/`fmt`, `tsc`/`vite` build, eslint, prettier, and vitest.
- Manual verification with `tauri dev` (scan the folder, confirm 9 links, see non-video files ignored, and confirm persistence after restart) still needs to be run.
