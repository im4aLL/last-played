# T010 - Link a single movie or episode file

- Status: Todo
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
