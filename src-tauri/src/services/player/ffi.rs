#![allow(non_snake_case, dead_code)]

use std::ffi::{c_char, c_int, c_void};
use std::path::Path;

use libloading::Library;

use crate::error::{AppError, Result};

pub type LibvlcInstance = *mut c_void;
pub type LibvlcMedia = *mut c_void;
pub type LibvlcMediaPlayer = *mut c_void;
pub type LibvlcTimeT = i64;
pub type LibvlcTrackDescriptionPtr = *mut LibvlcTrackDescription;

#[repr(C)]
pub struct LibvlcTrackDescription {
    pub id: c_int,
    pub name: *mut c_char,
    pub next: LibvlcTrackDescriptionPtr,
}

pub const STATE_NOTHING_SPECIAL: c_int = 0;
pub const STATE_OPENING: c_int = 1;
pub const STATE_BUFFERING: c_int = 2;
pub const STATE_PLAYING: c_int = 3;
pub const STATE_PAUSED: c_int = 4;
pub const STATE_STOPPED: c_int = 5;
pub const STATE_ENDED: c_int = 6;
pub const STATE_ERROR: c_int = 7;

macro_rules! vlc_symbols {
    ($( $name:ident : fn($($arg:ty),*) $(-> $ret:ty)? ; )*) => {
        pub struct VlcFns {
            $( pub $name: unsafe extern "C" fn($($arg),*) $(-> $ret)?, )*
        }

        impl VlcFns {
            unsafe fn load(library: &Library) -> Result<Self> {
                Ok(Self {
                    $( $name: {
                        let symbol: libloading::Symbol<unsafe extern "C" fn($($arg),*) $(-> $ret)?> =
                            library.get(concat!(stringify!($name), "\0").as_bytes()).map_err(|error| {
                                AppError::Player(format!(
                                    "libvlc is missing the {} symbol: {error}",
                                    stringify!($name)
                                ))
                            })?;
                        *symbol
                    }, )*
                })
            }
        }
    };
}

vlc_symbols! {
    libvlc_new: fn(c_int, *const *const c_char) -> LibvlcInstance;
    libvlc_release: fn(LibvlcInstance);
    libvlc_errmsg: fn() -> *const c_char;

    libvlc_media_new_path: fn(LibvlcInstance, *const c_char) -> LibvlcMedia;
    libvlc_media_release: fn(LibvlcMedia);
    libvlc_media_add_option: fn(LibvlcMedia, *const c_char);

    libvlc_media_player_new: fn(LibvlcInstance) -> LibvlcMediaPlayer;
    libvlc_media_player_set_media: fn(LibvlcMediaPlayer, LibvlcMedia);
    libvlc_media_player_release: fn(LibvlcMediaPlayer);
    libvlc_media_player_play: fn(LibvlcMediaPlayer) -> c_int;
    libvlc_media_player_set_pause: fn(LibvlcMediaPlayer, c_int);
    libvlc_media_player_stop: fn(LibvlcMediaPlayer);
    libvlc_media_player_is_playing: fn(LibvlcMediaPlayer) -> c_int;
    libvlc_media_player_get_state: fn(LibvlcMediaPlayer) -> c_int;
    libvlc_media_player_get_time: fn(LibvlcMediaPlayer) -> LibvlcTimeT;
    libvlc_media_player_set_time: fn(LibvlcMediaPlayer, LibvlcTimeT);
    libvlc_media_player_get_length: fn(LibvlcMediaPlayer) -> LibvlcTimeT;
    libvlc_media_player_get_position: fn(LibvlcMediaPlayer) -> f32;
    libvlc_media_player_set_position: fn(LibvlcMediaPlayer, f32);
    libvlc_media_player_get_rate: fn(LibvlcMediaPlayer) -> f32;
    libvlc_media_player_set_rate: fn(LibvlcMediaPlayer, f32) -> c_int;
    libvlc_media_player_has_vout: fn(LibvlcMediaPlayer) -> c_int;

    libvlc_audio_get_volume: fn(LibvlcMediaPlayer) -> c_int;
    libvlc_audio_set_volume: fn(LibvlcMediaPlayer, c_int) -> c_int;
    libvlc_audio_get_mute: fn(LibvlcMediaPlayer) -> c_int;
    libvlc_audio_set_mute: fn(LibvlcMediaPlayer, c_int);
    libvlc_audio_get_track: fn(LibvlcMediaPlayer) -> c_int;
    libvlc_audio_set_track: fn(LibvlcMediaPlayer, c_int) -> c_int;
    libvlc_audio_get_track_description: fn(LibvlcMediaPlayer) -> LibvlcTrackDescriptionPtr;

    libvlc_video_get_spu: fn(LibvlcMediaPlayer) -> c_int;
    libvlc_video_set_spu: fn(LibvlcMediaPlayer, c_int) -> c_int;
    libvlc_video_get_spu_description: fn(LibvlcMediaPlayer) -> LibvlcTrackDescriptionPtr;
    libvlc_video_set_key_input: fn(LibvlcMediaPlayer, c_int);
    libvlc_video_set_mouse_input: fn(LibvlcMediaPlayer, c_int);

    libvlc_track_description_list_release: fn(LibvlcTrackDescriptionPtr);

    libvlc_media_player_set_hwnd: fn(LibvlcMediaPlayer, *mut c_void);
    libvlc_media_player_set_nsobject: fn(LibvlcMediaPlayer, *mut c_void);
    libvlc_media_player_set_xwindow: fn(LibvlcMediaPlayer, u32);
}

pub struct Vlc {
    library: Library,
    pub fns: VlcFns,
    pub instance: LibvlcInstance,
}

unsafe impl Send for Vlc {}
unsafe impl Sync for Vlc {}

impl Vlc {
    pub fn load(
        plugin_path: Option<&Path>,
        bundle_dir: Option<&Path>,
        options: &[String],
    ) -> Result<Self> {
        if let Some(plugin_path) = plugin_path {
            std::env::set_var("VLC_PLUGIN_PATH", plugin_path);
        }

        let library_path = super::locate_library(bundle_dir)?;
        preload_core(&library_path);

        let library = unsafe {
            Library::new(&library_path).map_err(|error| {
                AppError::Player(format!(
                    "failed to load libvlc from {}: {error}",
                    library_path.display()
                ))
            })?
        };
        let fns = unsafe { VlcFns::load(&library)? };

        let mut args: Vec<std::ffi::CString> = ["--no-video-title-show", "--quiet"]
            .iter()
            .map(|arg| std::ffi::CString::new(*arg).expect("static args have no nul"))
            .collect();
        for option in options {
            let value = std::ffi::CString::new(option.as_str()).map_err(|_| {
                AppError::Player(format!("libvlc option contains a null byte: {option}"))
            })?;
            args.push(value);
        }
        let mut argv: Vec<*const c_char> = args.iter().map(|arg| arg.as_ptr()).collect();
        let instance = unsafe {
            (fns.libvlc_new)(argv.len() as c_int, argv.as_mut_ptr())
        };
        if instance.is_null() {
            return Err(AppError::Player("libvlc failed to initialize.".to_string()));
        }

        Ok(Self {
            library,
            fns,
            instance,
        })
    }

    pub fn error_message(&self) -> Option<String> {
        let pointer = unsafe { (self.fns.libvlc_errmsg)() };
        if pointer.is_null() {
            return None;
        }
        Some(
            unsafe { std::ffi::CStr::from_ptr(pointer) }
                .to_string_lossy()
                .into_owned(),
        )
    }
}

impl Drop for Vlc {
    fn drop(&mut self) {
        unsafe {
            (self.fns.libvlc_release)(self.instance);
        }
        let _ = &self.library;
    }
}

#[cfg(unix)]
fn preload_core(library_path: &Path) {
    use libloading::os::unix::{Library as UnixLibrary, RTLD_GLOBAL, RTLD_NOW};

    let Some(dir) = library_path.parent() else {
        return;
    };
    let candidates: &[&str] = if cfg!(target_os = "macos") {
        &["libvlccore.dylib", "libvlccore.9.dylib"]
    } else {
        &["libvlccore.so.9", "libvlccore.so"]
    };
    for candidate in candidates {
        let path = dir.join(candidate);
        if path.exists() {
            if let Ok(core) = unsafe { UnixLibrary::open(Some(&path), RTLD_NOW | RTLD_GLOBAL) } {
                std::mem::forget(core);
                return;
            }
        }
    }
}

/// Preloads `libvlccore` on Windows so the bundled `libvlc.dll` resolves its
/// dependency from the same folder before the plugins are loaded.
#[cfg(windows)]
fn preload_core(library_path: &Path) {
    let Some(dir) = library_path.parent() else {
        return;
    };
    let path = dir.join("libvlccore.dll");
    if path.exists() {
        if let Ok(core) = unsafe { libloading::Library::new(&path) } {
            std::mem::forget(core);
        }
    }
}
