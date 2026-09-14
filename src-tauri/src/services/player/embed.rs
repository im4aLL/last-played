use std::ffi::c_void;

use serde::Deserialize;

use crate::error::{AppError, Result};

/// Bounds of the video surface in CSS pixels, relative to the webview
/// viewport (top-left origin). The webview viewport maps one-to-one onto the
/// native window in points.
#[derive(Debug, Clone, Copy, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SurfaceBounds {
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
}

/// A native drawable embedded into the application window.
///
/// On macOS this is a child `NSView` created on the main thread; elsewhere the
/// window's own handle is used directly. Only the numeric handles are stored so
/// the value stays `Send` and can live in shared application state.
#[derive(Debug, Clone, Copy)]
pub struct NativeSurface {
    view: usize,
    parent: usize,
}

impl NativeSurface {
    /// Creates the drawable. Must be called on the main thread on macOS. On
    /// macOS `window` is the `NSWindow` pointer; the drawable is added as a
    /// sibling of the webview so it can be positioned above it.
    #[cfg(target_os = "macos")]
    pub fn create(window: *mut c_void) -> Result<Self> {
        use objc2::rc::Retained;
        use objc2::{MainThreadMarker, MainThreadOnly};
        use objc2_app_kit::{NSView, NSWindow};
        use objc2_foundation::{NSPoint, NSRect, NSSize};

        let marker = MainThreadMarker::new().ok_or_else(|| {
            AppError::Player("the video surface must be created on the main thread".to_string())
        })?;

        let window: &NSWindow = unsafe { &*(window as *const NSWindow) };
        let content: Retained<NSView> = window.contentView().ok_or_else(|| {
            AppError::Player("the window has no content view to embed the video into.".to_string())
        })?;

        let view = NSView::initWithFrame(
            NSView::alloc(marker),
            NSRect::new(NSPoint::new(0.0, 0.0), NSSize::new(320.0, 180.0)),
        );
        content.addSubview(&view);
        // Keep the surface hidden until the frontend reports its bounds.
        view.setHidden(true);

        let surface = Self {
            view: Retained::as_ptr(&view) as usize,
            parent: Retained::as_ptr(&content) as usize,
        };
        // The content view retains the child; release our own reference.
        drop(view);
        Ok(surface)
    }

    #[cfg(not(target_os = "macos"))]
    pub fn create(parent: *mut c_void) -> Result<Self> {
        Ok(Self {
            view: parent as usize,
            parent: parent as usize,
        })
    }

    /// Moves and resizes the drawable. Must be called on the main thread on macOS.
    #[cfg(target_os = "macos")]
    pub fn set_frame(&self, bounds: &SurfaceBounds) {
        use objc2_app_kit::NSView;
        use objc2_foundation::{NSPoint, NSRect, NSSize};

        if self.view == 0 || self.parent == 0 {
            return;
        }

        unsafe {
            let parent = &*(self.parent as *const NSView);
            let parent_bounds = parent.bounds();
            // AppKit's origin is bottom-left; the frontend reports top-left.
            let origin_y = parent_bounds.size.height - (bounds.y + bounds.height);
            let view = &*(self.view as *const NSView);
            view.setFrame(NSRect::new(
                NSPoint::new(bounds.x, origin_y),
                NSSize::new(bounds.width, bounds.height),
            ));
        }
    }

    #[cfg(not(target_os = "macos"))]
    pub fn set_frame(&self, _bounds: &SurfaceBounds) {}

    /// Shows or hides the drawable. Must be called on the main thread on macOS.
    #[cfg(target_os = "macos")]
    pub fn set_hidden(&self, hidden: bool) {
        use objc2_app_kit::NSView;

        if self.view == 0 {
            return;
        }
        unsafe {
            let view = &*(self.view as *const NSView);
            view.setHidden(hidden);
        }
    }

    #[cfg(not(target_os = "macos"))]
    pub fn set_hidden(&self, _hidden: bool) {}

    pub fn drawable(&self) -> *mut c_void {
        self.view as *mut c_void
    }
}
