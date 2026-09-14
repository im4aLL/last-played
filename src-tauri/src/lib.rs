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
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let config_dir = app.path().app_config_dir()?;
            let data_dir = app.path().app_data_dir()?;
            let resource_dir = app.path().resource_dir()?;

            let state = AppState::new(
                config_dir.join(crate::config::CONFIG_FILE_NAME),
                data_dir.join(crate::db::DB_FILE_NAME),
                resource_dir,
            )?;
            app.manage(state);

            let handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                crate::services::sync::background_loop(handle).await;
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::config::get_config,
            commands::config::get_device_id,
            commands::config::save_config,
            commands::config::set_db_mode,
            commands::sync::sync_now,
            commands::sync::get_sync_status,
            commands::db::get_health,
            commands::db::test_db_connection,
            commands::media::search_tmdb,
            commands::media::preview_tmdb_media,
            commands::media::add_media_from_tmdb,
            commands::media::refresh_metadata,
            commands::library::list_media,
            commands::library::get_media,
            commands::watch::save_progress,
            commands::watch::get_progress,
            commands::watch::set_watched,
            commands::watch::continue_watching,
            commands::linking::link_movie_file,
            commands::linking::link_episode_file,
            commands::linking::unlink_video_file,
            commands::scan::scan_series_folder,
            commands::scan::apply_scan_matches,
            commands::player::play_video,
            commands::player::player_command,
            commands::player::get_player_state,
            commands::player::set_player_bounds,
            commands::player::set_player_visible,
            commands::player::stop_player,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
