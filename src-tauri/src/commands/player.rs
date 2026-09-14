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
    if !Path::new(&path).is_file() {
        return Err(AppError::Player(format!(
            "The linked file could not be found: {path}"
        )));
    }

    let surface = ensure_surface(&state, &window)?;
    match bounds {
        Some(bounds) => apply_bounds(&window, surface, bounds, true),
        None => set_surface_hidden(&window, surface, false),
    }

    let mut guard = state.player();
    if guard.is_none() {
        *guard = Some(PlayerService::new()?);
    }

    let player = guard
        .as_mut()
        .ok_or_else(|| AppError::Player("The player is not available.".to_string()))?;
    player.attach_surface(&surface);

    let preferences = state.config().player;
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
