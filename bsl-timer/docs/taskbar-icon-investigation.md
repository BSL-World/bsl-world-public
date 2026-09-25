# Dynamic Windows taskbar icon investigation

## Status

Resolved in BSL-Timer 0.7.2.

The dynamic taskbar icon now follows the active timer theme in both development
runs and installed production builds.

## Intended behavior

The taskbar icon uses the color theme of the active timer.

The overdue state has higher priority than the normal theme color.

Changing the active timer or its theme updates the taskbar icon without
restarting the application.

## Existing native implementation

The Windows-specific implementation is in:

`src-tauri/src/lib.rs`

The runtime path:

1. recolors the bundled PNG source image;
2. converts the RGBA image into a native Windows `HICON` with `CreateIcon`;
3. obtains the main window `HWND`;
4. sends both `WM_SETICON / ICON_SMALL` and `WM_SETICON / ICON_BIG`;
5. updates the window-class icons with `SetClassLongPtrW` using
   `GCLP_HICONSM` and `GCLP_HICON`;
6. retains the current native icon handles in `TaskbarIconState`;
7. destroys the previous native icon handles after replacement.

The implementation uses larger PNG sources for the native window icons because
Windows may ignore a small icon source at some taskbar scaling settings.

## Diagnostic evidence

A temporary diagnostic build recorded the main window handle, its root and root
owner, the requested small and large icon handles, and the icon handles returned
by `WM_GETICON` and the window class.

The installed build confirmed that:

- the main `HWND`, root window, and root owner were the same window;
- the window had no parent;
- `WM_SETICON` reached the correct window;
- the small and large window icons matched the requested native handles;
- the small and large window-class icons also matched the requested handles;
- the native handles changed when the application theme changed.

Despite those successful native updates, the installed application continued to
show the static packaged icon on the taskbar. The same executable displayed the
dynamic icon when copied to and launched from an unregistered path.

This isolated the problem from icon recoloring and native window handling. The
remaining difference was Windows Shell identity for the installed application.

## Confirmed root cause

The NSIS-installed shortcut and executable were associated with the packaged
application identity and its static icon. Windows Shell used that identity for
taskbar grouping and continued to display the packaged icon even though the live
window accepted the new `WM_SETICON` and class icons.

The brief earlier observation of a working taskbar icon was consistent with
launching a development, release, or copied executable that was not being
grouped under the installed shortcut identity. Reconstructing the exact historic
launch path was not necessary after the production cause was isolated.

## Resolution

On Windows, BSL-Timer now calls
`SetCurrentProcessExplicitAppUserModelID` before Tauri creates the main window.
The runtime identity is:

`ru.bsl-world.bsl-timer.runtime`

This separates the live application window from the installed shortcut identity
for taskbar presentation. Windows Shell then uses the icon supplied by the live
window, while the installed shortcut and packaged executable retain their normal
static application icon.

The native `WM_SETICON` and `SetClassLongPtrW` implementation remains in
place because it supplies the actual dynamically recolored icon.

## Validation

The fix was validated in an installed production build launched from the Start
menu. The taskbar icon:

- matched the active timer theme;
- changed immediately when the theme changed;
- remained consistent with the application and tray icons;
- continued to work after application exit and relaunch;
- worked without creating an additional taskbar button.

Version 0.7.2 also passed the Rust build checks and all 23 automated JavaScript
tests before the final production build and installed-application verification.

The final signed Pro release was then validated through the production updater:
version 0.7.1 detected, downloaded, verified, and installed version 0.7.2. After
the update, the application reported the correct version and edition, retained
its user data, and continued to update the taskbar icon dynamically.

## Related releases

- 0.6.0 introduced the dynamic taskbar icon.
- 0.6.2 reworked the Windows runtime taskbar icon update path.
- 0.6.4 finalized packaged Windows icon resources.
- 0.7.2 resolved the installed-build Windows Shell identity conflict.
