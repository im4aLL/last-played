mod embed;
mod ffi;

use std::ffi::{c_int, CStr, CString};
use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};

use crate::error::{AppError, Result};

pub use embed::{NativeSurface, SurfaceBounds};
use ffi::*;

const SUBTITLE_DISABLED: i64 = -1;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PlayerTrack {
    pub id: i64,
    pub label: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PlayerState {
    pub status: String,
    pub position_seconds: f64,
    pub duration_seconds: f64,
    pub progress: f64,
    pub volume: i64,
    pub muted: bool,
    pub rate: f64,
    pub audio_track_id: i64,
    pub subtitle_track_id: i64,
    pub audio_tracks: Vec<PlayerTrack>,
    pub subtitle_tracks: Vec<PlayerTrack>,
    pub has_video: bool,
    pub has_media: bool,
    pub media_path: Option<String>,
}

impl PlayerState {
    pub(crate) fn empty() -> Self {
        Self {
            status: "idle".to_string(),
            position_seconds: 0.0,
            duration_seconds: 0.0,
            progress: 0.0,
            volume: 0,
            muted: false,
            rate: 1.0,
            audio_track_id: 0,
            subtitle_track_id: SUBTITLE_DISABLED,
            audio_tracks: Vec::new(),
            subtitle_tracks: Vec::new(),
            has_video: false,
            has_media: false,
            media_path: None,
        }
    }
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PlayerCommand {
    pub action: String,
    #[serde(default)]
    pub value: Option<f64>,
}

pub struct PlayerService {
    vlc: Vlc,
    media_player: LibvlcMediaPlayer,
    current_path: Option<String>,
}

unsafe impl Send for PlayerService {}

impl PlayerService {
    pub fn new() -> Result<Self> {
        let vlc = Vlc::load(locate_plugins().as_deref())?;
        let media_player = unsafe { (vlc.fns.libvlc_media_player_new)(vlc.instance) };
        if media_player.is_null() {
            return Err(AppError::Player(
                "libvlc could not create a media player.".to_string(),
            ));
        }

        unsafe {
            (vlc.fns.libvlc_video_set_key_input)(media_player, 0);
            (vlc.fns.libvlc_video_set_mouse_input)(media_player, 0);
        }

        Ok(Self {
            vlc,
            media_player,
            current_path: None,
        })
    }

    #[cfg(target_os = "macos")]
    pub fn attach_surface(&self, surface: &NativeSurface) {
        unsafe {
            (self.vlc.fns.libvlc_media_player_set_nsobject)(
                self.media_player,
                surface.drawable(),
            );
        }
    }

    #[cfg(windows)]
    pub fn attach_surface(&self, surface: &NativeSurface) {
        unsafe {
            (self.vlc.fns.libvlc_media_player_set_hwnd)(self.media_player, surface.drawable());
        }
    }

    #[cfg(not(any(target_os = "macos", windows)))]
    pub fn attach_surface(&self, surface: &NativeSurface) {
        unsafe {
            (self.vlc.fns.libvlc_media_player_set_xwindow)(
                self.media_player,
                surface.drawable() as usize as u32,
            );
        }
    }

    pub fn play(&mut self, path: &str, start_seconds: Option<f64>) -> Result<()> {
        let c_path = CString::new(path)
            .map_err(|_| AppError::Player("the media path contains a null byte.".to_string()))?;

        unsafe {
            let media = (self.vlc.fns.libvlc_media_new_path)(self.vlc.instance, c_path.as_ptr());
            if media.is_null() {
                return Err(AppError::Player(format!(
                    "libvlc could not open {path}."
                )));
            }

            if let Some(seconds) = start_seconds.filter(|value| *value > 1.0) {
                if let Ok(option) = CString::new(format!(":start-time={seconds}")) {
                    (self.vlc.fns.libvlc_media_add_option)(media, option.as_ptr());
                }
            }

            (self.vlc.fns.libvlc_media_player_set_media)(self.media_player, media);
            // The player keeps its own reference to the media.
            (self.vlc.fns.libvlc_media_release)(media);

            let result = (self.vlc.fns.libvlc_media_player_play)(self.media_player);
            if result == -1 {
                let message = self
                    .vlc
                    .error_message()
                    .unwrap_or_else(|| "libvlc failed to start playback.".to_string());
                return Err(AppError::Player(message));
            }
        }

        self.current_path = Some(path.to_string());
        Ok(())
    }

    pub fn stop(&mut self) {
        unsafe {
            (self.vlc.fns.libvlc_media_player_stop)(self.media_player);
        }
    }

    pub fn command(&mut self, command: PlayerCommand) -> Result<()> {
        let value = command.value.unwrap_or(0.0);
        unsafe {
            let f = &self.vlc.fns;
            match command.action.as_str() {
                "play" => {
                    if (f.libvlc_media_player_get_state)(self.media_player) == STATE_ENDED {
                        (f.libvlc_media_player_set_time)(self.media_player, 0);
                    }
                    (f.libvlc_media_player_play)(self.media_player);
                }
                "pause" => (f.libvlc_media_player_set_pause)(self.media_player, 1),
                "toggle" => {
                    if (f.libvlc_media_player_is_playing)(self.media_player) != 0 {
                        (f.libvlc_media_player_set_pause)(self.media_player, 1);
                    } else {
                        if (f.libvlc_media_player_get_state)(self.media_player) == STATE_ENDED {
                            (f.libvlc_media_player_set_time)(self.media_player, 0);
                        }
                        (f.libvlc_media_player_play)(self.media_player);
                    }
                }
                "stop" => (f.libvlc_media_player_stop)(self.media_player),
                "seek" => {
                    (f.libvlc_media_player_set_time)(self.media_player, to_millis(value))
                }
                "seekBy" => {
                    let current = (f.libvlc_media_player_get_time)(self.media_player);
                    let target = (current as f64 + value * 1000.0).max(0.0);
                    (f.libvlc_media_player_set_time)(self.media_player, target as LibvlcTimeT)
                }
                "setVolume" => {
                    let volume = value.round().clamp(0.0, 100.0) as c_int;
                    (f.libvlc_audio_set_volume)(self.media_player, volume);
                }
                "adjustVolume" => {
                    let current = (f.libvlc_audio_get_volume)(self.media_player) as f64;
                    let volume = (current + value).round().clamp(0.0, 100.0) as c_int;
                    (f.libvlc_audio_set_volume)(self.media_player, volume);
                }
                "toggleMute" => {
                    let muted = (f.libvlc_audio_get_mute)(self.media_player) != 0;
                    (f.libvlc_audio_set_mute)(self.media_player, i32::from(!muted));
                }
                "setMuted" => {
                    (f.libvlc_audio_set_mute)(self.media_player, i32::from(value != 0.0));
                }
                "setRate" => {
                    (f.libvlc_media_player_set_rate)(self.media_player, value as f32);
                }
                "selectAudioTrack" => {
                    (f.libvlc_audio_set_track)(self.media_player, value as c_int);
                }
                "selectSubtitleTrack" => {
                    (f.libvlc_video_set_spu)(self.media_player, value as c_int);
                }
                other => {
                    return Err(AppError::Player(format!(
                        "unknown player action '{other}'."
                    )));
                }
            }
        }
        Ok(())
    }

    pub fn state(&mut self) -> PlayerState {
        if self.current_path.is_none() {
            return PlayerState::empty();
        }

        unsafe {
            let f = &self.vlc.fns;
            let mp = self.media_player;

            let status = status_label((f.libvlc_media_player_get_state)(mp));
            let position_seconds = (f.libvlc_media_player_get_time)(mp) as f64 / 1000.0;
            let duration_seconds = (f.libvlc_media_player_get_length)(mp) as f64 / 1000.0;
            let progress = if duration_seconds > 0.0 {
                (position_seconds / duration_seconds).clamp(0.0, 1.0)
            } else {
                (f.libvlc_media_player_get_position)(mp) as f64
            };

            PlayerState {
                status,
                position_seconds,
                duration_seconds,
                progress,
                volume: (f.libvlc_audio_get_volume)(mp).clamp(0, 100) as i64,
                muted: (f.libvlc_audio_get_mute)(mp) != 0,
                rate: {
                    let rate = (f.libvlc_media_player_get_rate)(mp) as f64;
                    if rate > 0.0 { rate } else { 1.0 }
                },
                audio_track_id: (f.libvlc_audio_get_track)(mp) as i64,
                subtitle_track_id: (f.libvlc_video_get_spu)(mp) as i64,
                audio_tracks: track_list(
                    (f.libvlc_audio_get_track_description)(mp),
                    f.libvlc_track_description_list_release,
                ),
                subtitle_tracks: track_list(
                    (f.libvlc_video_get_spu_description)(mp),
                    f.libvlc_track_description_list_release,
                ),
                has_video: (f.libvlc_media_player_has_vout)(mp) > 0,
                has_media: true,
                media_path: self.current_path.clone(),
            }
        }
    }
}

impl Drop for PlayerService {
    fn drop(&mut self) {
        unsafe {
            (self.vlc.fns.libvlc_media_player_stop)(self.media_player);
            (self.vlc.fns.libvlc_media_player_release)(self.media_player);
        }
    }
}

fn to_millis(seconds: f64) -> LibvlcTimeT {
    (seconds * 1000.0).max(0.0) as LibvlcTimeT
}

fn status_label(state: c_int) -> String {
    match state {
        STATE_OPENING => "opening",
        STATE_BUFFERING => "buffering",
        STATE_PLAYING => "playing",
        STATE_PAUSED => "paused",
        STATE_STOPPED => "stopped",
        STATE_ENDED => "ended",
        STATE_ERROR => "error",
        _ => "idle",
    }
    .to_string()
}

unsafe fn track_list(
    head: LibvlcTrackDescriptionPtr,
    release: unsafe extern "C" fn(LibvlcTrackDescriptionPtr),
) -> Vec<PlayerTrack> {
    let mut tracks = Vec::new();
    let mut current = head;
    while !current.is_null() {
        let description = &*current;
        let label = if description.name.is_null() {
            String::new()
        } else {
            CStr::from_ptr(description.name)
                .to_string_lossy()
                .into_owned()
        };
        tracks.push(PlayerTrack {
            id: description.id as i64,
            label,
        });
        current = description.next;
    }
    if !head.is_null() {
        release(head);
    }
    tracks
}

fn library_names() -> &'static [&'static str] {
    #[cfg(target_os = "macos")]
    {
        &["libvlc.dylib", "libvlc.5.dylib"]
    }
    #[cfg(target_os = "windows")]
    {
        &["libvlc.dll"]
    }
    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    {
        &["libvlc.so.5", "libvlc.so"]
    }
}

fn library_in_dir(dir: &Path) -> Option<PathBuf> {
    library_names()
        .iter()
        .map(|name| dir.join(name))
        .find(|path| path.exists())
}

fn candidate_dirs() -> Vec<PathBuf> {
    #[cfg(target_os = "macos")]
    {
        vec![PathBuf::from("/Applications/VLC.app/Contents/MacOS/lib")]
    }
    #[cfg(target_os = "windows")]
    {
        let mut dirs = Vec::new();
        for variable in ["ProgramFiles", "ProgramFiles(x86)", "ProgramW6432"] {
            if let Ok(base) = std::env::var(variable) {
                dirs.push(PathBuf::from(base).join("VideoLAN").join("VLC"));
            }
        }
        dirs
    }
    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    {
        [
            "/usr/lib/x86_64-linux-gnu",
            "/usr/lib/aarch64-linux-gnu",
            "/usr/lib64",
            "/usr/lib",
            "/usr/local/lib",
        ]
        .iter()
        .map(PathBuf::from)
        .collect()
    }
}

pub(crate) fn locate_library() -> Result<PathBuf> {
    if let Ok(dir) = std::env::var("LAST_PLAYED_VLC_DIR") {
        if let Some(path) = library_in_dir(Path::new(&dir)) {
            return Ok(path);
        }
    }
    for dir in candidate_dirs() {
        if let Some(path) = library_in_dir(&dir) {
            return Ok(path);
        }
    }

    Err(AppError::Player(
        "libVLC was not found. Install VLC or set LAST_PLAYED_VLC_DIR to the folder containing it."
            .to_string(),
    ))
}

fn locate_plugins() -> Option<PathBuf> {
    if std::env::var_os("VLC_PLUGIN_PATH").is_some() {
        return None;
    }

    if let Ok(dir) = std::env::var("LAST_PLAYED_VLC_DIR") {
        let plugins = Path::new(&dir).join("plugins");
        if plugins.is_dir() {
            return Some(plugins);
        }
    }

    #[cfg(target_os = "macos")]
    {
        let plugins = PathBuf::from("/Applications/VLC.app/Contents/MacOS/plugins");
        if plugins.is_dir() {
            return Some(plugins);
        }
    }
    #[cfg(target_os = "windows")]
    {
        for dir in candidate_dirs() {
            let plugins = dir.join("plugins");
            if plugins.is_dir() {
                return Some(plugins);
            }
        }
    }
    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    {
        for dir in [
            "/usr/lib/vlc/plugins",
            "/usr/lib/x86_64-linux-gnu/vlc/plugins",
            "/usr/lib/aarch64-linux-gnu/vlc/plugins",
            "/usr/local/lib/vlc/plugins",
        ] {
            let plugins = PathBuf::from(dir);
            if plugins.is_dir() {
                return Some(plugins);
            }
        }
    }

    None
}
