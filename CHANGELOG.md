# Changelog

## 1.1.0 - 2026-09-16

Offline support: the app now degrades gracefully with no internet while the local library, scanning, linking, playback, and watch progress keep working unchanged.

- Added: global offline indicator in the app header, shown on all shell pages when the OS reports no connection.
- Added: offline messaging and blocking for Add media, Refresh metadata, Settings "Test connection" and "Sync now", and the remote setup path, each resuming automatically on reconnect.
- Added: scoped "Try anyway" escape hatch for Add media and Settings "Test connection" only, covering one flow without unblocking anything else.
- Added: sync gating - sync never runs while offline, queued changes stay pending, and sync resumes automatically when connectivity returns.
- Added: short per-request network timeouts on the remote database client so unreachable hosts fail fast instead of hanging.
- Changed: posters, backdrops, and episode stills skip remote loads while offline and keep the local gradient/title fallback.
- Fixed: invalid HTML nesting in the offline notice container.

## 1.0.0

Initial release.
