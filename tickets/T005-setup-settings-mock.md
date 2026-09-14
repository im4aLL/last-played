# T005 - First-run setup and Settings (mock)

- Status: Todo
- Phase: 1 - Frontend
- Depends on: T002
- Plan refs: PLAN.md (Local config and secrets), M1

## Outcome

A first-run screen asking "Local or Remote?", and a Settings page with TMDB API key, device name, player preferences, and Turso URL/token fields that are shown only in remote mode. No persistence yet; state is local to the session.

## Tasks

- First-run DB mode selection screen with Local and Remote options.
- Settings page sections: TMDB key, device, player preferences (watched threshold, preferred subtitle/audio language, volume), and database mode.
- Turso URL/token fields rendered only when mode is Remote.
- Switching mode in the UI toggles the Turso fields immediately.

## Verify

- First-run screen shows Local and Remote choices.
- Settings shows Turso fields only in Remote mode.
- No Turso URL or token field is ever shown in Local mode.

## Out of scope

- Writing config, connecting to a database, or validating keys.
