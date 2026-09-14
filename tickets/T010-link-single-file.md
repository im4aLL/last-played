# T010 - Link a single movie or episode file

- Status: Done
- Phase: 2 - Functionality
- Depends on: T009
- Plan refs: PLAN.md (Data model, Folder scan and bulk linking), M4

## Outcome

A movie and a single episode can each be linked to a local file via a browse button. Links are scoped to the current `device_id` and persist across restarts. Linked state is visible in the UI.

## Tasks

- Add the Tauri dialog plugin and file picker.
- `video_file` repository scoped by `device_id` (unique per device + path).
- Commands: `link_movie_file`, single-episode link, `unlink_video_file`.
- Store `size_bytes`, `mtime`, and `container` on link.
- UI to browse and link, plus unlink, with linked state shown on the detail page.
- Register the current device row on startup.

## Verify

- Link an mp4 to a movie and an mkv to one episode, restart, and confirm links persist.
- Confirm links from another `device_id` are not treated as present locally.

## Out of scope

- Folder scan and playback.

## Notes

- Migration 2 adds `device` and `video_file`. `video_file` is unique per (`device_id`, `path`); `episode_id` is null for movies and set for episodes. Indexes on `media_item_id` and `episode_id`.
- Repositories: `device::register` (upsert with `last_seen_at`) and `video_file` (`replace_for_target`, `delete`, `list_for_media`, all device-scoped). `episode::find_by_id` was added.
- The current device is registered lazily on the first database open (the app's startup data path), using `device_id` and `device_name` from local config and `std::env::consts::OS` as the platform.
- Commands `link_movie_file`, `link_episode_file`, and `unlink_video_file` live in `commands/linking.rs`. On link the backend probes the file for `size_bytes`, `mtime` (epoch millis), and `container` (lowercase extension). Linking replaces any existing link for the same target on this device and moves a file already linked elsewhere on the device, so the (`device_id`, `path`) constraint never trips the UI.
- `get_media` now returns `videoFile` for a movie and for each episode (plus the existing `fileLinked` boolean), read only for the current `device_id`; other devices' links are never shown as present locally.
- The Tauri dialog plugin was added on both sides (`tauri-plugin-dialog` + `@tauri-apps/plugin-dialog`) with the `dialog:default` capability. The frontend `features/linking/` module holds the video picker, the `useLinkFile` mutation hook, `LinkFileButton`, and `LinkedFile` (name plus unlink). They are wired into the movie hero and each episode row; linking invalidates the `["media"]` queries so the detail page refreshes.
- Per the repo convention, no unit tests were added. Verified with `cargo check`/`clippy`/`fmt`, frontend `tsc`/`vite` build, eslint, prettier, and vitest, plus SQLite checks of the migration and queries against a copy of the real `library.db` (device upsert, duplicate-path constraint, target replacement, device-scoped read and unlink).
- Manual verification (link an mp4 to a movie, an mkv to an episode, restart, and confirm a different `device_id` is not treated as linked) needs `tauri dev`.
