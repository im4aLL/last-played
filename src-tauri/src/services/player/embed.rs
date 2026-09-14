use std::ffi::c_void;

use serde::Deserialize;

use crate::error::{AppError, Result};

/// A plain `NSView` subclass that is invisible to hit-testing. libVLC renders
/// into it, but mouse events fall through to the webview composited above it so
/// the player can handle clicks, pointer moves, and focus over the video area.
#[cfg(target_os = "macos")]
mod click_through_view {
    use objc2::rc::Retained;
    use objc2::{define_class, msg_send, MainThreadMarker, MainThreadOnly};
    use objc2_app_kit::NSView;
    use objc2_foundation::{NSPoint, NSRect};

    #[derive(Default)]
    struct Ivars;

    define_class!(
        // SAFETY: `NSView` has no subclassing requirements and this class does
        // not implement `Drop`.
        #[unsafe(super(NSView))]
        #[thread_kind = MainThreadOnly]
        #[name = "LastPlayedVideoView"]
        #[ivars = Ivars]
        struct ClickThroughView;

        impl ClickThroughView {
            #[unsafe(method(hitTest:))]
            fn hit_test(&self, _point: NSPoint) -> Option<&NSView> {
                None
            }
        }
    );

    impl ClickThroughView {
        fn new(marker: MainThreadMarker, frame: NSRect) -> Retained<Self> {
            let view = Self::alloc(marker).set_ivars(Ivars);
            unsafe { msg_send![super(view), initWithFrame: frame] }
        }
    }

    pub(super) fn create(marker: MainThreadMarker, frame: NSRect) -> Retained<NSView> {
        ClickThroughView::new(marker, frame).into_super()
    }
}

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
    /// sibling of the webview, below it, so transparent web content can overlay
    /// the video.
    #[cfg(target_os = "macos")]
    pub fn create(window: *mut c_void) -> Result<Self> {
        use objc2::rc::Retained;
        use objc2::runtime::{AnyClass, NSObjectProtocol};
        use objc2::MainThreadMarker;
        use objc2_app_kit::{NSColor, NSView, NSWindow, NSWindowOrderingMode};
        use objc2_foundation::{NSPoint, NSRect, NSSize};

        let marker = MainThreadMarker::new().ok_or_else(|| {
            AppError::Player("the video surface must be created on the main thread".to_string())
        })?;

        let window: &NSWindow = unsafe { &*(window as *const NSWindow) };
        let content: Retained<NSView> = window.contentView().ok_or_else(|| {
            AppError::Player("the window has no content view to embed the video into.".to_string())
        })?;

        let view = click_through_view::create(
            marker,
            NSRect::new(NSPoint::new(0.0, 0.0), NSSize::new(320.0, 180.0)),
        );
        // The webview is transparent on the player route and must composite on
        // top of the video, so the surface is inserted below the webview rather
        // than above it. HTML controls can then overlay the video.
        let webview = AnyClass::get(c"WKWebView").and_then(|class| {
            content
                .subviews()
                .iter()
                .find(|subview| subview.isKindOfClass(class))
        });
        match webview {
            Some(webview) => content.addSubview_positioned_relativeTo(
                &view,
                NSWindowOrderingMode::Below,
                Some(&webview),
            ),
            None => content.addSubview(&view),
        }
        // The webview renders a transparent player route, so the window itself
        // supplies the black letterbox behind the video.
        let black = NSColor::blackColor();
        window.setBackgroundColor(Some(&black));
        window.setOpaque(true);
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
