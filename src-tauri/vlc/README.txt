Bundled libVLC staging folder.

Packaged builds ship libVLC here so the app does not depend on a system VLC
install. The binaries are not committed; populate this folder per platform with:

    node scripts/stage-vlc.mjs

Expected layout (the runtime searches both `vlc/` and `vlc/lib/` for the
library, and `vlc/plugins/` for the plugin cache):

    vlc/lib/libvlc.dylib      (macOS)   vlc/libvlc.dll    (Windows)   vlc/lib/libvlc.so.5 (Linux)
    vlc/lib/libvlccore.*      core
    vlc/plugins/...           plugin modules

Keep this file so the `vlc/**/*` resource glob always matches. See
docs/PACKAGING.md for signing, notarization, and LGPL compliance notes.
