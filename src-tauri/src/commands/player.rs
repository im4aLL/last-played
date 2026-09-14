use std::ffi::c_void;
use std::path::Path;

use tauri::{State, WebviewWindow};

use crate::error::{AppError, Result};
use crate::services::player::{
    NativeSurface, PlaybackPreferences, PlayerCommand, PlayerService, PlayerState, SurfaceBounds,
};
use crate::state::AppState;

#[cfg(target_os = "macos")]
fn parent_handle(window: &WebviewWindow) -> Result<*mut c_void> {
    window
        .ns_window()
        .map_err(|error| AppError::Player(error.to_string()))
}

#[cfg(not(target_os = "macos"))]
fn parent_handle(window: &WebviewWindow) -> Result<*mut c_void> {
    use raw_window_handle::{HasWindowHandle, RawWindowHandle};

    let handle = window
        .window_handle()
        .map_err(|error| AppError::Player(error.to_string()))?;

    match handle.as_raw() {
        RawWindowHandle::Win32(win32) => Ok(win32.hwnd.get() as *mut c_void),
        RawWindowHandle::Xlib(xlib) => Ok(xlib.window as *mut c_void),
        RawWindowHandle::Xcb(xcb) => Ok(xcb.window.get() as *mut c_void),
        other => Err(AppError::Player(format!(
            "the window does not expose a supported native handle: {other:?}"
        ))),
    }
}

fn ensure_surface(state: &AppState, window: &WebviewWindow) -> Result<NativeSurface> {
    if let Some(surface) = *state.surface() {
        return Ok(surface);
    }

    let parent = parent_handle(window)? as usize;
    let (sender, receiver) = std::sync::mpsc::channel();
    window
        .run_on_main_thread(move || {
            let result = NativeSurface::create(parent as *mut c_void);
            let _ = sender.send(result);
        })
        .map_err(|error| AppError::Player(error.to_string()))?;

    let surface = receiver.recv().map_err(|_| {
        AppError::Player("the window closed before the video surface was created.".to_string())
    })??;

    *state.surface() = Some(surface);
    Ok(surface)
}

fn apply_bounds(
    window: &WebviewWindow,
    surface: NativeSurface,
    bounds: SurfaceBounds,
    reveal: bool,
) {
    let _ = window.run_on_main_thread(move || {
        surface.set_frame(&bounds);
        if reveal {
            surface.set_hidden(false);
        }
    });
}

fn set_surface_hidden(window: &WebviewWindow, surface: NativeSurface, hidden: bool) {
    let _ = window.run_on_main_thread(move || surface.set_hidden(hidden));
}

#[tauri::command]
pub async fn play_video(
    window: WebviewWindow,
    state: State<'_, AppState>,
    path: String,
    start_seconds: Option<f64>,
    bounds: Option<SurfaceBounds>,
) -> Result<PlayerState> {
    let path = path.trim().to_string();
    if path.is_empty() {
        return Err(AppError::Player("No video file was provided.".to_string()));
    }
    let file_path = Path::new(&path);
    if !file_path.exists() {
        return Err(AppError::Player(format!(
            "The linked file no longer exists at {path}. It may have been moved or deleted; link it again from the media page."
        )));
    }
    if !file_path.is_file() {
        return Err(AppError::Player(format!(
            "The linked path is not a file: {path}"
        )));
    }

    let surface = ensure_surface(&state, &window)?;
    match bounds {
        Some(bounds) => apply_bounds(&window, surface, bounds, true),
        None => set_surface_hidden(&window, surface, false),
    }

    let preferences = state.config().player;
    let mut guard = state.player();

    // Subtitle text options are libVLC instance options, so changed values
    // only take effect after the player is rebuilt: on the next file here,
    // or immediately via apply_subtitle_size for shortcut presses.
    // Normalize both sides so legacy absolute-pixel configs do not force a
    // rebuild on every file.
    let wanted_size = crate::config::normalize_subtitle_size(preferences.subtitle_size);
    let options_changed = guard.as_ref().is_some_and(|player| {
        player.subtitle_size() != wanted_size
            || player.subtitle_font() != preferences.subtitle_font.trim()
    });
    if guard.is_none() || options_changed {
        *guard = None;
        let bundle_dir = state.bundled_vlc_dir();
        *guard = Some(PlayerService::new(
            bundle_dir.as_deref(),
            preferences.subtitle_size,
            &preferences.subtitle_font,
        )?);
    }

    let player = guard
        .as_mut()
        .ok_or_else(|| AppError::Player("The player is not available.".to_string()))?;
    player.attach_surface(&surface);

    let playback = PlaybackPreferences {
        audio_language: Some(preferences.audio_language),
        subtitle_language: Some(preferences.subtitle_language),
    };
    player.play(&path, start_seconds, &playback)?;
    Ok(player.state())
}

#[tauri::command]
pub async fn player_command(
    state: State<'_, AppState>,
    command: PlayerCommand,
) -> Result<PlayerState> {
    let mut guard = state.player();
    let player = guard
        .as_mut()
        .ok_or_else(|| AppError::Player("The player is not running.".to_string()))?;
    player.command(command)?;
    Ok(player.state())
}

/// Rebuilds the player with a new relative subtitle size and resumes the
/// current video in place, so size shortcuts apply live.
///
/// libVLC reads `freetype-rel-fontsize` as an instance option, which is why
/// Settings notes it applies on the next video. For an explicit shortcut
/// press we accept a brief restart instead: snapshot position, rate, volume,
/// tracks, and pause state, recreate the instance with the new size, and
/// restore everything. The size is also persisted to config immediately so a
/// quick episode switch cannot revert to the stale value.
#[tauri::command]
pub async fn apply_subtitle_size(state: State<'_, AppState>, size: u16) -> Result<PlayerState> {
    let size = crate::config::normalize_subtitle_size(size);
    state.update_config(|config| {
        config.player.subtitle_size = size;
    })?;

    let Some(surface) = *state.surface() else {
        return Ok(PlayerState::empty());
    };

    // Snapshot while the old instance is still playing so polls keep seeing
    // it until the swap.
    let snapshot = {
        let mut guard = state.player();
        match guard.as_mut() {
            Some(player) => player.state(),
            None => return Ok(PlayerState::empty()),
        }
    };

    let Some(path) = snapshot.media_path.clone() else {
        return Ok(snapshot);
    };

    // Build the replacement before dropping the old instance so a failure
    // leaves playback untouched.
    let config = state.config();
    let bundle_dir = state.bundled_vlc_dir();
    let mut fresh = PlayerService::new(bundle_dir.as_deref(), size, &config.player.subtitle_font)?;
    fresh.attach_surface(&surface);

    let playback = PlaybackPreferences {
        audio_language: Some(config.player.audio_language),
        subtitle_language: Some(config.player.subtitle_language),
    };
    fresh.play(&path, Some(snapshot.position_seconds), &playback)?;

    // A fresh instance does not inherit these; restore immediately.
    let _ = fresh.command(PlayerCommand {
        action: "setVolume".to_string(),
        value: Some(snapshot.volume as f64),
    });
    let _ = fresh.command(PlayerCommand {
        action: "setMuted".to_string(),
        value: Some(if snapshot.muted { 1.0 } else { 0.0 }),
    });
    if snapshot.rate > 0.0 {
        let _ = fresh.command(PlayerCommand {
            action: "setRate".to_string(),
            value: Some(snapshot.rate),
        });
    }
    if snapshot.status == "paused" || snapshot.status == "ended" {
        let _ = fresh.command(PlayerCommand {
            action: "pause".to_string(),
            value: None,
        });
    }

    // Swap first so status polls see the new instance during the track wait.
    *state.player() = Some(fresh);

    // Track lists populate asynchronously after play(). Wait briefly so
    // restoring the user's explicit track selection sticks instead of
    // racing the parser. Files without a track kind skip their wait.
    let wanted_audio = snapshot.audio_track_id;
    let wanted_spu = snapshot.subtitle_track_id;
    for _ in 0..10 {
        let (audio_ready, spu_ready) = {
            let mut guard = state.player();
            match guard.as_mut() {
                Some(player) => {
                    let live = player.state();
                    let audio_ready = live
                        .audio_tracks
                        .iter()
                        .any(|track| track.id == wanted_audio)
                        || !live.audio_tracks.is_empty();
                    let spu_ready = wanted_spu == -1
                        || live
                            .subtitle_tracks
                            .iter()
                            .any(|track| track.id == wanted_spu)
                        || !live.subtitle_tracks.is_empty();
                    (audio_ready, spu_ready)
                }
                None => break,
            }
        };
        if audio_ready && spu_ready {
            break;
        }
        tokio::time::sleep(std::time::Duration::from_millis(80)).await;
    }

    {
        let mut guard = state.player();
        if let Some(player) = guard.as_mut() {
            let _ = player.command(PlayerCommand {
                action: "selectAudioTrack".to_string(),
                value: Some(wanted_audio as f64),
            });
            let _ = player.command(PlayerCommand {
                action: "selectSubtitleTrack".to_string(),
                value: Some(wanted_spu as f64),
            });
            return Ok(player.state());
        }
    }
    Ok(PlayerState::empty())
}

#[tauri::command]
pub async fn get_player_state(state: State<'_, AppState>) -> Result<PlayerState> {
    let mut guard = state.player();
    match guard.as_mut() {
        Some(player) => Ok(player.state()),
        None => Ok(PlayerState::empty()),
    }
}

#[tauri::command]
pub async fn set_player_bounds(
    window: WebviewWindow,
    state: State<'_, AppState>,
    bounds: SurfaceBounds,
) -> Result<()> {
    if let Some(surface) = *state.surface() {
        apply_bounds(&window, surface, bounds, true);
    }
    Ok(())
}

#[tauri::command]
pub async fn set_player_visible(
    window: WebviewWindow,
    state: State<'_, AppState>,
    visible: bool,
) -> Result<()> {
    if let Some(surface) = *state.surface() {
        set_surface_hidden(&window, surface, !visible);
    }
    Ok(())
}

#[tauri::command]
pub async fn stop_player(window: WebviewWindow, state: State<'_, AppState>) -> Result<()> {
    if let Some(player) = state.player().as_mut() {
        player.stop();
    }
    if let Some(surface) = *state.surface() {
        set_surface_hidden(&window, surface, true);
    }
    Ok(())
}
