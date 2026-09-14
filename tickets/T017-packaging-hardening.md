# T017 - Cross-platform packaging and hardening

- Status: Todo
- Phase: 2 - Functionality
- Depends on: T012, T014, T015
- Plan refs: PLAN.md (Risks, Testing strategy), M11

## Outcome

Installable builds for macOS, Windows, and Linux that include libVLC and start clean. Secrets are safe and errors are graceful.

## Tasks

- Bundle per-platform libVLC shared libraries + plugins and set the plugin path.
- Icons and bundle metadata.
- macOS signing/notarization notes covering the app and libVLC libraries; LGPL compliance checklist (dynamic linking, notices, allow relinking).
- Error and empty-state coverage: missing file, moved file, duplicate scan, corrupt media.
- Cross-platform path handling review (paths treated as opaque device-local strings).
- Regression tests for defects found during hardening.

## Verify

- Install and run on each target OS.
- Link and play a file with a native path on each OS.
- Confirm no secret is written to the synced DB.

## Out of scope

- Auto-update, crash reporting, and telemetry.
