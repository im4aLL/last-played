# T007 - Local database and Local mode

- Status: Done
- Phase: 2 - Functionality
- Depends on: T001, T005
- Plan refs: PLAN.md (Local config and secrets, Rust module structure), M1

## Outcome

On first launch the user chooses Local or Remote. Choosing Local creates a SQLite-compatible file via the `turso` crate, runs migrations, and remembers the choice across restarts. Local mode never asks for a Turso URL or token. Settings shows the DB path and schema version.

## Tasks

- Config module: load/save local config, generate `device_id` once per machine, store `device_name` and `db_mode`.
- Database module: open a local DB with `turso::Builder::new_local()`.
- Migration runner with a `schema_migrations` table.
- `get_config`, `save_config`, `set_db_mode`, `test_db_connection`, `get_device_id` commands.
- Health command returning DB path and schema version.
- Wire the setup screen so Local completes without Turso prompts; remote path can be stubbed for now.
- Pin the `turso` crate version and keep all access behind repositories.

## Verify

- Choose Local, restart, confirm no prompt and the correct DB path/version.
- Confirm no Turso fields are requested in Local mode.
- Unit test the migration runner.

## Out of scope

- Real tables beyond migrations, TMDB, and Turso sync (T014).

## Notes

- Migration runner is in place with an empty, append-only `MIGRATIONS` list; the first real tables land in T008.
- Per the repo convention, no unit tests were added. The runner was verified at runtime (a local file is created, the `schema_migrations` table is created, and applying is idempotent).
- Remote mode is a stub that persists the URL/token and uses the same local file without sync; real sync arrives in T014.
- App-wide config now lives in the Rust backend (`config.json` in the app config dir) and the webview loads/saves it through `get_config` / `save_config`. Settings shows the DB path and schema version.
