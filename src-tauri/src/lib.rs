mod commands;
mod config;
mod db;
mod domain;
mod error;
mod services;
mod state;

use tauri::Manager;

use crate::state::AppState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let config_dir = app.path().app_config_dir()?;
            let data_dir = app.path().app_data_dir()?;

            let state = AppState::new(
                config_dir.join(crate::config::CONFIG_FILE_NAME),
                data_dir.join(crate::db::DB_FILE_NAME),
            )?;
            app.manage(state);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::config::get_config,
            commands::config::get_device_id,
            commands::config::save_config,
            commands::config::set_db_mode,
            commands::db::get_health,
            commands::db::test_db_connection,
            commands::media::search_tmdb,
            commands::media::preview_tmdb_media,
            commands::media::add_media_from_tmdb,
            commands::media::refresh_metadata,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
